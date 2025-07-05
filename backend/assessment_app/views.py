import datetime
import json
import logging
import os
import re
from bson import ObjectId
from dotenv import load_dotenv
from django.http import JsonResponse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework.parsers import JSONParser
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from transformers import pipeline
from keybert import KeyBERT
from groq import Groq
import fitz  # PyMuPDF

from .serializers import PDFUploadSerializer
from .groq_client import generate_questions_with_groq,evaluate_code_questions
from backend.mongo_client import test_attempts_collection, questions_collection

# Setup
load_dotenv()
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.DEBUG)
summarizer = pipeline("summarization", model="facebook/bart-large-cnn")
kw_model = KeyBERT()

GENERIC_CS_KEYWORDS = [
    "data structure", "linked list", "stack", "queue", "tree", "graph",
    "algorithm", "sorting", "searching", "recursion", "dynamic programming",
    "oops", "inheritance", "polymorphism", "encapsulation", "abstraction",
    "class", "object", "constructor", "destructor", "interface",
    "database", "sql", "network", "protocol", "operating system"
]

def clean_text(text: str) -> str:
    patterns = [
        r'P\.T\.O\s*\d*',
        r'\b(Prepared by|Author|Dr\.|Prof\.|Department of|University of|College of|Institute of)\b.*?\n',
        r'Page \d+ of \d+',
        r'\b(Syllabus|Course Code|Module [IVX]+)\b.*?\n',
        r'\n{2,}',
        r'\s+',
    ]
    for pattern in patterns:
        text = re.sub(pattern, ' ', text, flags=re.IGNORECASE)
    text = re.sub(r'[\?\!\.]{2,}', '.', text)
    text = re.sub(r'\b(\w+)(?:\s+\1){2,}\b', r'\1', text, flags=re.IGNORECASE)
    return text.strip()

def extract_keywords(text: str, top_n: int = 10) -> list:
    try:
        keywords = kw_model.extract_keywords(
            text,
            keyphrase_ngram_range=(1, 2),
            stop_words='english',
            top_n=top_n,
            use_mmr=True,
            diversity=0.7
        )
        extracted = [kw[0] for kw in keywords]
        cs_keywords = [kw for kw in extracted if any(gkw in kw.lower() for gkw in GENERIC_CS_KEYWORDS)]
        return cs_keywords or extracted[:top_n] or GENERIC_CS_KEYWORDS[:top_n]
    except Exception as e:
        logger.error(f"Keyword extraction error: {e}")
        return GENERIC_CS_KEYWORDS[:top_n]

def detect_language(text: str) -> str:
    text = text.lower()
    for lang in ["python", "cpp", "java", "javascript"]:
        if lang in text or (lang == "cpp" and "c++" in text):
            return lang
    return "python"

def summarize_text(text: str, max_words: int = 2000) -> str:
    try:
        chunk_size = 1000
        chunks = [text[i:i + chunk_size] for i in range(0, len(text), chunk_size)]
        summaries = [clean_text(summarizer(chunk, max_length=200, min_length=50, do_sample=False)[0]['summary_text']) for chunk in chunks]
        combined = " ".join(summaries)
        combined = " ".join(combined.split()[:max_words])
        keywords = extract_keywords(combined, top_n=10)
        return f"{combined} Keywords: {', '.join(keywords)}."
    except Exception as e:
        logger.error(f"Summarization error: {e}")
        return text[:max_words * 5]


@method_decorator(csrf_exempt, name='dispatch')
class PDFQuestionUploadView(APIView):
    def post(self, request):
        serializer = PDFUploadSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)

        pdf_file = serializer.validated_data['pdf_file']
        try:
            text = self.extract_text_from_pdf(pdf_file)
            if not text.strip():
                return Response({'error': 'No extractable text'}, status=400)

            cleaned = clean_text(text)
            summary = summarize_text(cleaned)
            language = detect_language(summary)
            questions = generate_questions_with_groq(summary, language)

            if not questions:
                return Response({'error': 'No questions generated'}, status=400)

            for i, q in enumerate(questions, 1):
                q['id'] = i
                if q['type'] == 'mcq':
                    q['correctAnswer'] = int(q.get('correctAnswer', 0))
                elif q['type'] == 'coding':
                    q['language'] = language
                    q['code'] = q.get('code', '')

            inserted = questions_collection.insert_many(questions)
            for i, q in enumerate(questions):
                q['_id'] = str(inserted.inserted_ids[i])

            return Response({'questions': questions}, status=200)

        except Exception as e:
            logger.exception("Error processing PDF")
            return Response({'error': f'PDF processing failed: {str(e)}'}, status=500)

    def extract_text_from_pdf(self, pdf_file) -> str:
        doc = fitz.open(stream=pdf_file.read(), filetype="pdf")
        text = "\n".join(page.get_text() for page in doc)
        doc.close()
        return text.strip()

@method_decorator(csrf_exempt, name='dispatch')
class SubmitAssessmentView(APIView):
    def post(self, request):
        try:
            data = request.data
            user_id = data.get("user_id")
            questions = data.get("questions", [])
            total = data.get("total_questions")
            time_taken = data.get("time_taken_seconds")

            if not user_id or not questions:
                return Response({"error": "Missing fields"}, status=400)

            # Separate coding and MCQ questions
            coding_questions = [q for q in questions if q.get("type") == "coding"]
            mcq_questions = [q for q in questions if q.get("type") == "mcq"]

            # Evaluate all coding questions via Groq
            evaluations = evaluate_code_questions(coding_questions)

            total_marks = 0
            updated_questions = []

            for q in questions:
                if q.get("type") == "mcq":
                    correct = q.get("userAnswer") == q.get("correctAnswer")
                    if correct:
                        total_marks += 1
                    updated_questions.append(q)

                elif q.get("type") == "coding":
                    eval_data = evaluations.get(str(q["id"]), {})
                    score = eval_data.get("score", 0)
                    remarks = eval_data.get("remarks", "")
                    suggested_code = eval_data.get("suggestedCode", "")

                    marks_awarded = round(score / 5)
                    total_marks += marks_awarded

                    q["evaluation"] = {
                        "score": score,
                        "remarks": remarks,
                        "suggestedCode": suggested_code,
                        "marksAwarded": marks_awarded
                    }

                    updated_questions.append(q)

            correct_mcqs = sum(1 for q in mcq_questions if q.get("userAnswer") == q.get("correctAnswer"))

            entry = {
                "user_id": user_id,
                "questions": updated_questions,
                "created_at": datetime.datetime.utcnow(),
                "bookmark": False,
                "total_questions": total,
                "marks": total_marks,
                "time_taken": time_taken,
                "correct_answers": correct_mcqs
            }

            inserted = test_attempts_collection.insert_one(entry)
            return Response({"message": "Submitted", "id": str(inserted.inserted_id)}, status=200)

        except Exception as e:
            logger.exception("Submission error")
            return Response({"error": "Server error", "details": str(e)}, status=500)

class AssessmentHistoryView(APIView):
    def get(self, request):
        user_id = request.GET.get("user_id")
        if not user_id:
            return Response({"error": "Missing user_id"}, status=400)
        try:
            tests = test_attempts_collection.find({"user_id": user_id}).sort("created_at", -1)

            response = []
            for test in tests:
                date = test.get("created_at")
                date_str = date.strftime("%Y-%m-%d") if isinstance(date, datetime.datetime) else ""

                response.append({
                    "id": str(test["_id"]),
                    "title": f"Test-paper-{str(test['_id'])[-4:]}",
                    "date": date_str,
                    "numQuestions": test.get("total_questions", 0),
                    "duration": round(test.get("time_taken", 0) / 60),
                    "score": test.get("marks", 0),
                    "bookmarked": test.get("bookmark", False)
                })

            return Response({"tests": response}, status=200)
        except Exception as e:
            logger.exception("History fetch error")
            return Response({"error": "Internal server error"}, status=500)


class RetakeTestView(APIView):
    def get(self, request, test_id):
        try:
            test = test_attempts_collection.find_one({"_id": ObjectId(test_id)})
            if not test:
                return Response({'error': 'Test not found'}, status=404)

            questions = test.get('questions', [])
            return Response({'questions': questions}, status=200)

        except Exception as e:
            logger.exception(f"Error loading retake test {test_id}: {e}")
            return Response({'error': 'Internal server error'}, status=500)


class BookmarkedTestsView(APIView):
    def patch(self, request, test_id):
        try:
            bookmarked = request.data.get('bookmarked')
            if bookmarked is None:
                return Response({'error': 'Missing bookmarked field'}, status=400)

            result = test_attempts_collection.update_one(
                {'_id': ObjectId(test_id)},
                {'$set': {'bookmark': bookmarked}}
            )

            if result.matched_count == 0:
                return Response({'error': 'Test not found'}, status=404)

            return Response({'message': 'Bookmark updated'}, status=200)

        except Exception as e:
            return Response({'error': str(e)}, status=500)
        
    def get(self, request):
        user_id = request.GET.get('user_id')
        if not user_id:
            return Response({'error': 'Missing user_id'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            bookmarked_tests = test_attempts_collection.find({
                'user_id': user_id,
                'bookmark': True
            })

            result = []
            for test in bookmarked_tests:
                result.append({
                    'id': str(test['_id']),
                    'title': f"Test Paper-{str(test['_id'])[-4:]}",
                    'date': test.get('created_at', '').strftime('%Y-%m-%d') if isinstance(test.get('created_at'), datetime.datetime) else '',
                    'numQuestions': test.get('total_questions', 0),
                    'duration': test.get('time_taken', 0),
                    'score': test.get('marks', 0),
                    'bookmarked': True
                })

            return Response({'tests': result}, status=status.HTTP_200_OK)

        except Exception as e:
            logger.exception("Error fetching bookmarked tests")
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
