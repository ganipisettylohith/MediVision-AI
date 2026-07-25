# 🩺 MediVision AI

MediVision AI is an AI-powered medical intelligence platform designed to assist healthcare professionals in analyzing medical images and generating AI-assisted medical reports.

The application combines Deep Learning, Explainable AI (Grad-CAM), and Google's Gemini AI to provide accurate predictions, visual explanations, and structured medical reports through an easy-to-use web interface.

> **Disclaimer:** This application is developed for educational and research purposes. It is intended to assist healthcare professionals and should not be used as a replacement for clinical judgment or professional medical diagnosis.

---

# Features

- Medical image analysis
- AI-assisted medical report generation
- Explainable AI using Grad-CAM
- Confidence score and prediction visualization
- Secure user authentication
- Prediction history management
- REST API using FastAPI
- Responsive React frontend
- SQLite database integration
- Docker support

---

# Technology Stack

## Frontend

- React
- TypeScript
- Tailwind CSS
- Axios

## Backend

- FastAPI
- Python
- SQLAlchemy
- SQLite

## Artificial Intelligence

- PyTorch
- EfficientNet / DenseNet
- Grad-CAM
- Google Gemini API

## DevOps

- Docker
- GitHub

---

# Project Architecture

```
                React Frontend
                       │
                       ▼
                 FastAPI Backend
          ┌────────────┼────────────┐
          │            │            │
          ▼            ▼            ▼
    Deep Learning   Grad-CAM    Gemini AI
          │
          ▼
      SQLite Database
```

---

# Project Structure

```
MediVision-AI
│
├── backend
├── frontend
├── outputs
├── docker-compose.yml
├── README.md
└── .gitignore
```

---

# How It Works

1. User signs in to the application.
2. Upload a medical image.
3. The deep learning model analyzes the image.
4. Grad-CAM highlights the important regions used for prediction.
5. Gemini generates a structured medical report.
6. The results are displayed on the dashboard.
7. The prediction history is stored in the database.

---

# API Endpoints

| Method | Endpoint | Description |
|---------|----------|-------------|
| POST | `/analysis` | Analyze a medical image |
| GET | `/health` | Health check |
| GET | `/history` | View prediction history |
| DELETE | `/history/{id}` | Delete a prediction |

---

# Installation

## Clone the repository

```bash
git clone https://github.com/ganipisettylohith/MediVision-AI.git

cd MediVision-AI
```

---

## Backend

```bash
cd backend

pip install -r requirements.txt

uvicorn app.main:app --reload
```

---

## Frontend

```bash
cd frontend

npm install

npm run dev
```

---

# Run with Docker

```bash
docker-compose up --build
```

---

# Future Improvements

- Support additional medical imaging models
- Multi-language report generation
- Cloud storage integration
- Role-based access control
- Hospital information system integration
- Performance optimization

---

# Author

**Lohith Ganipisetty**

GitHub:
https://github.com/ganipisettylohith

---

# License

This project was developed as part of an AI/ML Engineering technical assessment and is intended for educational purposes.
