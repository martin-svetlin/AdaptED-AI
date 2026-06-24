from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, UploadFile, File
from dotenv import load_dotenv
from pypdf import PdfReader
import google.generativeai as genai
import tempfile
import json
import os

load_dotenv()

genai.configure(
    api_key=os.getenv("GEMINI_API_KEY")
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = genai.GenerativeModel("gemini-2.5-flash-lite")


@app.get("/")
def root():
    return {"message": "Backend running"}


@app.get("/test-ai")
def test_ai():

    response = model.generate_content(
        "Say hello to the Adaptive Learning Platform."
    )

    return {
        "response": response.text
    }


@app.post("/extract-topics")
async def extract_topics(file: UploadFile = File(...)):

    print("EXTRACT TOPICS CALLED")

    with tempfile.NamedTemporaryFile(
        delete=False,
        suffix=".pdf"
    ) as temp_file:

        temp_file.write(await file.read())

        temp_path = temp_file.name

    reader = PdfReader(temp_path)

    pdf_text = ""

    for page in reader.pages:
        page_text = page.extract_text()

        if page_text:
            pdf_text += page_text + "\n"

    prompt = f"""
Extract between 5 and 7 high-level learning topics.

Do not create very granular subtopics.

Group related concepts together.

Topic names should be short and concise.

Each topic should be 2-5 words maximum.

Avoid long academic titles.

Return ONLY a JSON array.

Examples:

[
  "Caesar Cipher",
  "Vigenere Cipher",
  "Vernam Cipher"
]

or

[
  "Hash Fundamentals",
  "Hash Security",
  "Hash Attacks",
  "SHA Family",
  "SHA-3",
  "Sponge Construction"
]

Lecture Notes:

{pdf_text}
"""

    response = model.generate_content(prompt)

    try:

        clean_text = (
            response.text
            .replace("```json", "")
            .replace("```", "")
            .strip()
        )

        topics = json.loads(clean_text)

        return {
            "topics": topics
        }

    except Exception as e:

        return {
            "error": str(e),
            "raw_response": response.text
        }



@app.post("/generate-questions")
async def generate_questions(data: dict):

    topics = data.get("topics", [])

    all_questions = {}

    batch_size = 3

    batches = [
        topics[i:i + batch_size]
        for i in range(0, len(topics), batch_size)
    ]

    for batch in batches:

        print(f"Generating batch: {batch}")

        topic_list = "\n".join(
            [f"- {topic}" for topic in batch]
        )

        prompt = f"""
You are an expert cryptography educator.

Generate questions for ALL of the following topics:

{topic_list}

For EACH topic generate:

- Exactly 3 Easy questions
- Exactly 3 Medium questions
- Exactly 3 Hard questions

Requirements:

- Use a balanced variety of formats.

Possible formats:
- Multiple Choice
- Short Answer
- Fill in the Blank
- True/False
- Scenario-Based

- Do not generate all questions in the same format.

Easy:
- Definitions
- Recognition
- Basic understanding

Medium:
- Application
- Small problem-solving tasks
- Explanation questions

Hard:
- Analysis
- Security implications
- Attack scenarios
- Comparisons

- Hard questions should be challenging but concise.
- Avoid overly long questions.

Answers:
- Maximum 1 sentence.

Explanations:
- Maximum 2 sentences.

For MCQs:
- Include options A, B, C and D.
- Store the answer as "A", "B", "C" or "D".

Return ONLY valid JSON.

Example:

{{
  "Caesar Cipher": {{
    "easy": [
      {{
        "question": "...",
        "answer": "...",
        "explanation": "..."
        "difficulty": "easy"
      }}
    ],
    "medium": [],
    "hard": []
  }},

  "Vigenere Cipher": {{
    "easy": [],
    "medium": [],
    "hard": []
  }}
}}
"""

        try:

            response = model.generate_content(prompt)

            clean_text = (
                response.text
                .replace("```json", "")
                .replace("```", "")
                .strip()
            )

            batch_questions = json.loads(clean_text)

            all_questions.update(batch_questions)

        except Exception as e:

            print(f"Batch failed: {batch}")
            print(f"Error: {e}")

            try:
                print("RAW RESPONSE:")
                print(response.text)
            except:
                pass

            if len(batch) == 1:

                all_questions[batch[0]] = {
                    "error": str(e)
                }

            else:

                print("Retrying topics individually...")

                for topic in batch:

                    try:

                        single_prompt = prompt.replace(
                            topic_list,
                            f"- {topic}"
                        )

                        response = model.generate_content(
                            single_prompt
                        )

                        clean_text = (
                            response.text
                            .replace("```json", "")
                            .replace("```", "")
                            .strip()
                        )

                        single_data = json.loads(clean_text)

                        if topic in single_data:
                            all_questions[topic] = single_data[topic]
                        else:
                            all_questions[topic] = single_data

                        print(f"Recovered topic: {topic}")

                    except Exception as retry_error:

                        print(f"Failed again: {topic}")
                        print(retry_error)

                        all_questions[topic] = {
                            "error": str(retry_error)
                        }

    return all_questions




@app.post("/generate-more-questions")
async def generate_more_questions(data: dict):

    topic = data.get("topic")

    easy_count = data.get("easyCount", 0)
    medium_count = data.get("mediumCount", 0)
    hard_count = data.get("hardCount", 0)

    prompt = f"""
You are an expert cryptography educator.

Generate questions ONLY for:

{topic}

Generate:

- Exactly {easy_count} Easy questions
- Exactly {medium_count} Medium questions
- Exactly {hard_count} Hard questions

Requirements:

- Avoid repeating previously generated questions. Be creative and generate different questions.

- Use a balanced variety of formats.

Possible formats:
- Multiple Choice
- Short Answer
- Fill in the Blank
- True/False
- Scenario-Based

- Do not generate all questions in the same format.

Easy:
- Definitions
- Recognition
- Basic understanding

Medium:
- Application of concepts
- Small problem-solving tasks
- Explanation questions

Hard:
- Analysis and reasoning
- Security implications
- Attack scenarios
- Comparisons

- Hard questions should be challenging but concise.
- Avoid overly long or multi-part questions.

Answers:
- Maximum 1 sentence.

Explanations:
- Maximum 2 sentences.

For multiple choice questions:
- Include four options labelled A, B, C and D.
- Store them in an "options" object.
- Store the correct answer as:
  "A", "B", "C" or "D".

Return ONLY valid JSON.

Example:

{{
  "Caesar Cipher": {{
    "easy": [
      {{
        "question": "...",
        "answer": "...",
        "explanation": "..."
        "difficulty": "easy"
      }}
    ],
    "medium": [],
    "hard": []
  }},

  "Vigenere Cipher": {{
    "easy": [],
    "medium": [],
    "hard": []
  }}
}}
"""

    response = model.generate_content(prompt)

    clean_text = (
        response.text
        .replace("```json", "")
        .replace("```", "")
        .strip()
    )

    return json.loads(clean_text)