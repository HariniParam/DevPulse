import sys
from django.http import JsonResponse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import PDFUploadSerializer
from backend.mongo_client import questions_collection
from .groq_client import generate_questions_with_groq
from transformers import pipeline
from keybert import KeyBERT
import fitz  # PyMuPDF
import re
from bson import ObjectId
import logging
import subprocess
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
import tempfile
import os
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework.parsers import JSONParser

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Initialize summarizer and keyword extractor
summarizer = pipeline("summarization", model="facebook/bart-large-cnn")
kw_model = KeyBERT()

# Generic computer science keywords for language detection and fallback
GENERIC_CS_KEYWORDS = [
    "data structure", "linked list", "stack", "queue", "tree", "graph",
    "algorithm", "sorting", "searching", "recursion", "dynamic programming",
    "oops", "inheritance", "polymorphism", "encapsulation", "abstraction",
    "class", "object", "constructor", "destructor", "interface",
    "database", "sql", "network", "protocol", "operating system"
]

def clean_text(text: str) -> str:
    """
    Clean text by removing common PDF metadata, noise, and formatting artifacts.
    """
    patterns = [
        r'P\.T\.O\s*\d*',  # Page Turn Over
        r'\b(Prepared by|Author|Dr\.|Prof\.|Department of|University of|College of|Institute of)\b.*?\n',  # Author/institution
        r'Page \d+ of \d+',  # Page numbers
        r'\b(Syllabus|Course Code|Module [IVX]+)\b.*?\n',  # Syllabus headers
        r'\n{2,}',  # Multiple newlines
        r'\s+',  # Excessive whitespace
    ]
    for pattern in patterns:
        text = re.sub(pattern, ' ', text, flags=re.IGNORECASE)

    text = re.sub(r'[\?\!\.]{2,}', '.', text)  # Multiple punctuation
    text = re.sub(r'\b(\w+)(?:\s+\1){2,}\b', r'\1', text, flags=re.IGNORECASE)  # Repeated words
    return text.strip()

def extract_keywords(text: str, top_n: int = 10) -> list:
    """
    Extract relevant keywords using KeyBERT, falling back to generic CS keywords.
    """
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
        logger.debug(f"Extracted keywords: {cs_keywords or extracted[:top_n]}")
        return cs_keywords or extracted[:top_n] or GENERIC_CS_KEYWORDS[:top_n]
    except Exception as e:
        logger.error(f"Error extracting keywords: {str(e)}")
        return GENERIC_CS_KEYWORDS[:top_n]

def detect_language(text: str) -> str:
    """
    Detect preferred programming language based on text content.
    """
    text_lower = text.lower()
    for lang in ["python", "cpp", "java", "javascript"]:
        if lang in text_lower or (lang == "cpp" and "c++" in text_lower):
            logger.debug(f"Detected language: {lang}")
            return lang
    logger.debug("Defaulting to Python")
    return "python"

def summarize_text(text: str, max_words: int = 2000) -> str:
    """
    Summarize text to approximately 2000 words, enriched with keywords.
    """
    try:
        # Split text into chunks for summarization
        chunk_size = 1000
        chunks = [text[i:i + chunk_size] for i in range(0, len(text), chunk_size)]
        summaries = []
        for chunk in chunks:
            summary = summarizer(
                chunk,
                max_length=200,
                min_length=50,
                do_sample=False
            )[0]['summary_text']
            summaries.append(clean_text(summary))

        # Combine summaries
        combined_summary = " ".join(summaries)
        # Extract keywords to enrich summary
        keywords = extract_keywords(combined_summary, top_n=10)
        # Ensure summary is within word limit
        words = combined_summary.split()
        if len(words) > max_words:
            combined_summary = " ".join(words[:max_words])
        # Append keywords for context
        combined_summary += f" Keywords: {', '.join(keywords)}."
        logger.debug(f"Summary length: {len(combined_summary.split())} words")
        return clean_text(combined_summary)
    except Exception as e:
        logger.error(f"Error summarizing text: {str(e)}")
        return clean_text(text[:max_words * 5])

class PDFQuestionUploadView(APIView):
    def post(self, request):
        serializer = PDFUploadSerializer(data=request.data)
        if not serializer.is_valid():
            logger.error("Invalid serializer data")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        pdf_file = serializer.validated_data['pdf_file']
        try:
            # Extract and clean text
            raw_text = self.extract_text_from_pdf(pdf_file)
            if not raw_text.strip():
                logger.error("No extractable text from PDF")
                return Response({'error': 'No extractable text from PDF'}, status=status.HTTP_400_BAD_REQUEST)

            cleaned_text = clean_text(raw_text)
            logger.debug(f"Cleaned text length: {len(cleaned_text)} characters")

            # Summarize text to ~2000 words
            summarized_text = summarize_text(cleaned_text)
            # Detect programming language
            language = detect_language(summarized_text)

            # Generate questions with a single API call
            questions = generate_questions_with_groq(summarized_text, language)
            if not questions:
                logger.error("No questions generated from Groq API")
                return Response({'error': 'No questions generated from the PDF'}, status=status.HTTP_400_BAD_REQUEST)

            logger.debug(f"Generated {len(questions)} questions")

            # Assign sequential IDs
            for i, question in enumerate(questions, 1):
                question['id'] = i
                if question['type'] == 'mcq':
                    question['correctAnswer'] = int(question.get('correctAnswer', 0))
                elif question['type'] == 'coding':
                    question['language'] = language
                    question['code'] = question.get('code', '')

            # Insert into MongoDB
            inserted = questions_collection.insert_many(questions)
            logger.debug(f"Inserted {len(questions)} questions into MongoDB")

            # Prepare response with stringified ObjectIds
            questions_with_ids = []
            for i, question in enumerate(questions):
                question_copy = question.copy()
                question_copy['_id'] = str(inserted.inserted_ids[i])
                questions_with_ids.append(question_copy)

            return Response({'questions': questions_with_ids}, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Failed to process PDF: {str(e)}")
            return Response({'error': f'Failed to process PDF: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def extract_text_from_pdf(self, pdf_file) -> str:
        """
        Extract text from PDF using PyMuPDF.
        """
        try:
            doc = fitz.open(stream=pdf_file.read(), filetype="pdf")
            text = "\n".join(page.get_text() for page in doc)
            doc.close()
            logger.debug(f"Extracted text length: {len(text)} characters")
            return text.strip()
        except Exception as e:
            logger.error(f"Error extracting text from PDF: {str(e)}")
            raise

@method_decorator(csrf_exempt, name='dispatch')
class RunCodeView(APIView):
    def post(self, request, *args, **kwargs):
        code = request.data.get("code")
        language = request.data.get("language")
        test_cases = request.data.get("testCases", [])

        if not code or not language or not test_cases:
            return Response({"error": "Invalid payload"}, status=status.HTTP_400_BAD_REQUEST)

        results = []

        def format_input(input_str):
            try:
                parsed = json.loads(input_str)
                if isinstance(parsed, list):
                    return " ".join(map(str, parsed))  # convert [1, 2, 3] -> "1 2 3"
                elif isinstance(parsed, (int, float)):
                    return str(parsed)
                return input_str
            except:
                return input_str

        with tempfile.NamedTemporaryFile(mode="w+", suffix=".py", delete=False) as temp_file:
            temp_file.write(code)
            temp_file.flush()
            filepath = temp_file.name

        for test in test_cases:
            test_input = test.get("input", "")
            expected = str(test.get("expectedOutput", "")).strip()
            formatted_input = format_input(test_input)

            try:
                output = subprocess.check_output(
                    [sys.executable, filepath],
                    input=formatted_input.encode(),
                    stderr=subprocess.STDOUT,
                    timeout=5
                ).decode().strip()

                results.append({
                    "input": test_input,
                    "expectedOutput": expected,
                    "actualOutput": output,
                    "passed": output == expected
                })

            except subprocess.TimeoutExpired:
                results.append({
                    "input": test_input,
                    "expectedOutput": expected,
                    "actualOutput": "Timeout Error",
                    "passed": False
                })

            except subprocess.CalledProcessError as e:
                results.append({
                    "input": test_input,
                    "expectedOutput": expected,
                    "actualOutput": e.output.decode().strip(),
                    "passed": False
                })

            except Exception as e:
                results.append({
                    "input": test_input,
                    "expectedOutput": expected,
                    "actualOutput": str(e),
                    "passed": False
                })

        return Response({"results": results})