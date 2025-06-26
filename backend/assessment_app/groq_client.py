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
        "GENERATE HIGH-QUALITY ASSESSMENT QUESTIONS BASED ON THE FOLLOWING COMPUTER SCIENCE TEXT: "
        f"{text[:4000]}. "
        "FOLLOW THESE INSTRUCTIONS STRICTLY: "
        "1. CREATE EXACTLY 10 UNIQUE MULTIPLE-CHOICE QUESTIONS (MCQs) AND, IF THE TEXT CONTAINS PROGRAMMING-RELATED CONTENT (E.G., CODE, ALGORITHMS, DATA STRUCTURES), 2 CODING QUESTIONS. "
        "2. MCQs MUST BE CONCISE, INTERMEDIATE TO HARD LEVEL, AND DIRECTLY RELEVANT TO THE TEXT OR ITS KEYWORDS (E.G., DATA STRUCTURES, ALGORITHMS). "
        "3. EACH MCQ MUST HAVE 4 OPTIONS WITH ONE CORRECT ANSWER AND THREE PLAUSIBLE BUT INCORRECT DISTRACTORS. "
        f"4. CODING QUESTIONS MUST BE CLEAR, INTERMEDIATE-LEVEL PROBLEM STATEMENTS IN {language.upper()}, RELEVANT TO THE TEXT, AND INCLUDE NO CODE SNIPPETS. "
        "5. FOR EACH CODING QUESTION, ADD A 'testCases' FIELD: A LIST OF 5 TEST CASES, EACH WITH 'input' AND 'expectedOutput'. "
        "6. RETURN THE OUTPUT AS A VALID JSON ARRAY OF OBJECTS ENCLOSED IN SQUARE BRACKETS: "
        "[{\"type\": \"mcq\", \"text\": \"<question_text>\", \"options\": [\"<option1>\", \"<option2>\", \"<option3>\", \"<option4>\"], \"correctAnswer\": <index>}, "
        "{\"type\": \"coding\", \"text\": \"<problem_statement>\", \"language\": \"<language>\", \"code\": \"\", \"testCases\": [{\"input\": \"...\", \"expectedOutput\": \"...\"}, ...]}]. "
        "7. ENSURE QUESTIONS ARE UNIQUE, CLEAR, AND AVOID REPETITION OR VAGUE PHRASES. "
        "8. IF NO PROGRAMMING CONTENT IS DETECTED, RETURN ONLY 10 MCQs. "
        "9. EXCLUDE PDF METADATA (E.G., 'P.T.O', 'SYLLABUS', 'AUTHOR') FROM QUESTION TEXT. "
        "10. ENSURE THE JSON OUTPUT IS VALID, WELL-FORMATTED, AND CONTAINS NO EXTRA TEXT OR MARKDOWN. "
        "11. DO NOT INCLUDE ANY INTRODUCTORY PHRASES OR SENTENCES BEFORE THE JSON OUTPUT."
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

        # Try to parse JSON directly (if valid)
        try:
            questions = json.loads(response_text.strip())
        except json.JSONDecodeError:
            # fallback: try extracting JSON using regex
            match = re.search(r'\[\s*{.*}\s*\]', response_text, re.DOTALL)
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
            len(question['text'].strip()) > 20 and
            'testCases' in question and
            isinstance(question['testCases'], list) and
            all(isinstance(tc, dict) and 'input' in tc and 'expectedOutput' in tc for tc in question['testCases'])
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
                'text': f"Write a {language} function to calculate the sum of an array of integers.",
                'language': language,
                'code': '',
                'testCases': [
                    {"input": "[1, 2, 3]", "expectedOutput": "6"},
                    {"input": "[0, 0, 0]", "expectedOutput": "0"},
                    {"input": "[-1, 1]", "expectedOutput": "0"},
                    {"input": "[5]", "expectedOutput": "5"},
                    {"input": "[100, 200]", "expectedOutput": "300"},
                ]
            },
            {
                'type': 'coding',
                'text': f"Write a {language} function to reverse a string.",
                'language': language,
                'code': '',
                'testCases': [
                    {"input": "\"hello\"", "expectedOutput": "olleh"},
                    {"input": "\"\"", "expectedOutput": ""},
                    {"input": "\"a\"", "expectedOutput": "a"},
                    {"input": "\"abcd\"", "expectedOutput": "dcba"},
                    {"input": "\"12345\"", "expectedOutput": "54321"},
                ]
            }
        ]

    return questions
