# 🚀 DevPulse

DevPulse is a full-stack web application that helps users manage tasks, take AI-generated assessments from PDFs, track progress through data-driven analysis, and upload/store resumes. It integrates intelligent automation using NLP and AI models for question generation and performance insights.

---

## 🧠 Key Features

- **Task Management**: Create, schedule, and track tasks with status labels (Pending/Completed).
- **PDF-Based Assessment Generation**: Upload PDFs and auto-generate MCQs and QA questions using AI (LLMs).
- **Progress Analysis**: Monitor learning and task progress visually.
- **Resume Upload**: Securely upload and manage personal resumes.
- **Audit Logging**: All critical actions are recorded with timestamp, IP, and user agent.
- **User Authentication**: Register/Login with support for Google OAuth.
- **AI-Powered Insights**: Question generation, personalized learning recommendations, and productivity nudges.

---

## 🧑‍💻 Tech Stack

| Layer       | Technology               |
|-------------|---------------------------|
| Frontend    | Angular                   |
| Backend     | Django (Python)           |
| Database    | MongoDB (via Djongo or PyMongo) |
| AI/NLP      | OpenAI API / Hugging Face |
| Auth        | JWT & Google OAuth        |

---

## ⚙️ Setup Instructions

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
   SECRET_KEY=your-django-secret
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

3. Update environment file (`src/environments/environment.ts`) with backend API URL:
   ```ts
   export const environment = {
     production: false,
     apiUrl: 'http://localhost:8000/api'
   };
   ```

4. Run the frontend:
   ```bash
   ng serve
   ```

---

## 📦 API Endpoints Overview

| Endpoint                      | Method | Description                            |
|------------------------------|--------|----------------------------------------|
| `/api/auth/register/`        | POST   | User registration                      |
| `/api/auth/login/`           | POST   | User login                             |
| `/api/tasks/`                | GET/POST | Get or create tasks                   |
| `/api/assessments/`          | POST   | Upload PDF and generate questions      |
| `/api/analysis/`             | GET    | Get user analysis                      |
| `/api/resumes/`              | POST   | Upload resume                          |
| `/api/audit-log/`            | GET    | View audit logs                        |

---

## 🤖 AI Integration

- **PDF Parsing & MCQ Generation**: NLP pipeline powered by OpenAI/Groq or Hugging Face models.
- **Smart Task Suggestions**: Recommends task priorities based on behavior.
- **Performance Nudges**: Triggers reminders and insights if user productivity drops.
- **Optional Resume Intelligence**: Resume scoring and keyword extraction (coming soon).

---

## 📌 Future Enhancements

- Leaderboard or performance gamification.
- Voice-to-task using Speech Recognition.
- Admin dashboard for monitoring platform usage.
- Dark mode toggle across app.

---

## 🧑‍🔧 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

---

## 📃 License

This project is licensed under the MIT License.

---

## 🙌 Acknowledgments

- OpenAI & Hugging Face for NLP APIs
- Angular, Django, and MongoDB for robust web app foundation

---
