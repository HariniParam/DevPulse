# 🚀 DevPulse

DevPulse is a full-stack web application that helps users manage tasks, take AI-generated assessments from PDFs, track progress through data-driven analysis, and upload/analyse resumes. It integrates intelligent automation using AI models for question generation and performance insights.

---

## Key Features

- **Task Management**: Create, schedule, and track tasks with status labels (Pending/Completed).
- **PDF-Based Assessment Generation**: Upload PDFs and auto-generate MCQs and QA questions using AI (LLMs).
- **Progress Analysis**: Monitor learning and task progress visually.
- **Resume Analyser**: Securely upload and analyse personal resumes.
- **Audit Logging**: All critical actions are recorded with timestamp, IP, and user agent.
- **User Authentication**: Register/Login with support for Google OAuth.
- **AI-Powered Insights**: Question generation, personalized learning recommendations, and productivity nudges.

---

## Tech Stack

| Layer       | Technology               |
|-------------|---------------------------|
| Frontend    | Angular                   |
| Backend     | Django (Python)           |
| Database    | MongoDB (via Djongo or PyMongo) |
| AI      | Groq API  |

---

## Setup Instructions

### 🔹 Prerequisites

- Node.js + Angular CLI
- Python 3.9+
- MongoDB (local or cloud)
- `pip` / `virtualenv`

---

### 🔸 Backend (Django)

1. Navigate to backend folder:
   ```bash
   cd backend/
   ```

2. Create virtual environment and activate it:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure `.env` with your MongoDB URI:
   ```env
   MONGO_URI=mongodb://localhost:27017/devpulse
   JWT_SECRET=your-jwt-secret
   GROQ_API_KEY=your-groq-api-secret-key
   ```

5. Run the server:
   ```bash
   python manage.py runserver
   ```

---

### 🔸 Frontend (Angular)

1. Navigate to frontend folder:
   ```bash
   cd frontend/
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the frontend:
   ```bash
   ng serve
   ```

---

## AI Integration

- **PDF Parsing & MCQ Generation**: NLP pipeline powered by Groq models.
- **Performance Nudges**: Triggers reminders and insights if user productivity drops.
- **Optional Resume Intelligence**: Resume scoring and keyword extraction .

---

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

---
