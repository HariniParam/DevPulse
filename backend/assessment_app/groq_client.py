from groq import Groq
import json
import os
import logging
import re
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

SUPPORTED_LANGUAGES = ["python", "cpp", "java", "javascript"]

def generate_questions_with_groq(text: str, language: str) -> list:
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))

    prompt = (
        "GENERATE HIGH-QUALITY ASSESSMENT QUESTIONS BASED ON THE FOLLOWING COMPUTER SCIENCE TEXT:\n"
        f"{text[:4000]}\n\n"
        "INSTRUCTIONS:\n"
        "1. CREATE EXACTLY 10 UNIQUE MULTIPLE-CHOICE QUESTIONS (MCQs) AND, IF THE TEXT CONTAINS PROGRAMMING-RELATED CONTENT, 2 CODING QUESTIONS.\n"
        "2. EACH MCQ MUST HAVE 4 OPTIONS WITH ONE CORRECT ANSWER (index-based: 0 to 3).\n"
        f"3. CODING QUESTIONS MUST BE IN {language.upper()} AND DESCRIBE A PROBLEM WITHOUT PROVIDING CODE OR TEST CASES.\n"
        "4. RETURN A VALID JSON ARRAY OF OBJECTS:\n"
        "[{\"type\": \"mcq\", \"text\": \"<question>\", \"options\": [\"opt1\", \"opt2\", \"opt3\", \"opt4\"], \"correctAnswer\": <index>},\n"
        " {\"type\": \"coding\", \"text\": \"<problem>\", \"language\": \"<language>\", \"code\": \"\"}]\n"
        "5. DO NOT INCLUDE ANY TEST CASES, METADATA, EXAMPLES, OR INTRODUCTION.\n"
        "6. RETURN ONLY THE VALID JSON ARRAY. DO NOT RETURN ANY EXTRA TEXT."
    )

    try:
        completion = client.chat.completions.create(
            model="llama3-70b-8192",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=4000,
            top_p=0.9,
            stream=False,
        )

        response_text = completion.choices[0].message.content
        logger.debug(f"Groq API raw response: {response_text[:2000]}")

        try:
            questions = json.loads(response_text.strip())
        except json.JSONDecodeError:
            match = re.search(r'\[\s*{.*?}\s*\]', response_text, re.DOTALL)
            if not match:
                logger.error(f"Could not extract JSON array. Full response: {response_text}")
                return generate_fallback_questions(language)
            response_text = match.group(0)
            try:
                questions = json.loads(response_text)
            except json.JSONDecodeError as e:
                logger.error(f"JSON parsing error: {str(e)}, Response: {response_text}")
                return generate_fallback_questions(language)

        if not isinstance(questions, list):
            questions = [questions]

        valid_questions = [q for q in questions if is_valid_question(q)]
        logger.debug(f"Valid questions generated: {len(valid_questions)}")

        if len(valid_questions) < 10:
            logger.warning(f"Only {len(valid_questions)} valid questions, supplementing with fallback")
            valid_questions.extend(generate_fallback_questions(language)[:12 - len(valid_questions)])

        return valid_questions[:12]

    except Exception as e:
        logger.error(f"Groq API error: {str(e)}")
        return generate_fallback_questions(language)


def is_valid_question(question: dict) -> bool:
    if not isinstance(question, dict) or 'type' not in question or 'text' not in question:
        return False

    if question['type'] == 'mcq':
        return (
            'options' in question and
            isinstance(question.get('options'), list) and
            len(question['options']) == 4 and
            all(isinstance(opt, str) and opt.strip() for opt in question['options']) and
            'correctAnswer' in question and
            isinstance(question['correctAnswer'], (int, str)) and
            str(question['correctAnswer']).isdigit() and
            0 <= int(str(question['correctAnswer'])) <= 3 and
            len(question['text'].strip()) > 20 and
            not any(kw in question['text'].lower() for kw in ['p.t.o', 'syllabus', 'author'])
        )

    elif question['type'] == 'coding':
        return (
            'language' in question and
            isinstance(question['language'], str) and
            question['language'].lower() in SUPPORTED_LANGUAGES and
            'code' in question and
            isinstance(question['code'], str) and
            len(question['text'].strip()) > 20
        )

    return False


def generate_fallback_questions(language: str) -> list:
    logger.debug("Generating fallback questions...")
    questions = [
        {
            'type': 'mcq',
            'text': f"What is a key feature of {language} programming?",
            'options': [
                'Supports modularity and reusability',
                'Increases compilation time significantly',
                'Eliminates all variables',
                'Disables function calls'
            ],
            'correctAnswer': 0
        }
    ]

    for i in range(9):
        questions.append({
            'type': 'mcq',
            'text': f"What is the purpose of a common {language} feature {i+1}?",
            'options': [
                'To enhance code functionality',
                'To reduce program efficiency',
                'To remove data structures',
                'To disable error handling'
            ],
            'correctAnswer': 0
        })

    if language.lower() in SUPPORTED_LANGUAGES:
        questions += [
            {
                'type': 'coding',
                'text': f"Write a {language} function that calculates the sum of a list of integers.",
                'language': language,
                'code': ''
            },
            {
                'type': 'coding',
                'text': f"Write a {language} function that checks if a given string is a palindrome.",
                'language': language,
                'code': ''
            }
        ]

    return questions

def evaluate_code_questions(coding_questions):

    client = Groq(api_key=os.getenv("GROQ_API_KEY"))

    results = {}

    for q in coding_questions:
        try:
            prompt = (
                "You are an expert code evaluator.\n\n"
                f"Question:\n{q['text']}\n\n"
                f"User's Submission (in {q.get('language', 'unknown')}):\n{q['userAnswer']}\n\n"
                "Please evaluate the user's logic and correctness.\n\n"
                "Respond strictly in the following JSON format:\n"
                "{\n"
                "  \"score\": <score from 0 to 100 in steps of 20>,\n"
                "  \"remarks\": \"<brief remarks>\",\n"
                "  \"suggestedCode\": {\n"
                "    \"python\": \"<Python version of solution>\",\n"
                "    \"java\": \"<Java version of solution>\",\n"
                "    \"javascript\": \"<JavaScript version of solution>\",\n"
                "    \"c\": \"<C version of solution>\",\n"
                "    \"cpp\": \"<C++ version of solution>\"\n"
                "  }\n"
                "}\n\n"
                "Ensure each code block is directly in the JSON string values without any markdown, extra text, or formatting outside JSON.\n"
            )

            response = client.chat.completions.create(
                model="llama3-70b-8192",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.6,
                max_tokens=1000
            )

            import json, re
            content = response.choices[0].message.content.strip()
            match = re.search(r'{.*}', content, re.DOTALL)
            result = json.loads(match.group(0)) if match else {"score": 0, "remarks": "No valid response", "suggestedCode": ""}
            results[str(q["id"])] = result
        except Exception as e:
            results[str(q["id"])] = {"score": 0, "remarks": str(e), "suggestedCode": ""}

    return results