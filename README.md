# MediVision AI — End-to-End Smart Chest Scan Diagnostics Platform

MediVision AI is an end-to-end medical imaging and diagnostic assistance platform powered by **PyTorch Deep Learning**, **Grad-CAM Explainable AI (XAI)**, **Google Gemini LLM Medical Reports**, **FastAPI**, **Neon PostgreSQL / SQLite**, and **React 18 with TypeScript**.

---

## 🔒 Authentication & User Scoping

- **Authentication System**: Email + Password registration and login (`POST /api/v1/auth/register`, `POST /api/v1/auth/login`).
- **Security & Tokens**: Password hashing using PBKDF2-HMAC-SHA256 and 24-hour signed **JWT Access Tokens**.
- **User Scoping**: Every uploaded scan is tied to the logged-in user via a `user_id` foreign key on the `medical_scans` table. Users only view and manage their own scan history and dashboard statistics.
- **Token Expiry**: Expired sessions automatically redirect to `/login` with an informative session alert.
- **Account Management**: User profile inline updates, password change cards, and hard-account deletion with password confirmation safeguards.

---

## 🩺 Scan Type Framework & Clinical Roadmap

MediVision AI uses an **honest, capability-focused modality framework**:
- **Chest X-Ray**: Fully functional active pipeline powered by trained PyTorch deep learning models, Grad-CAM visual heatmaps, and Gemini LLM reports.
- **Brain MRI, CT Scan, Mammography, ECG**: Marked as **"Coming Soon — Clinical Roadmap"**. Predictions on uncalibrated non-X-ray uploads are intentionally disabled to preserve clinical integrity and prevent misleading outputs.

---

## 🛠️ Technology Stack & Architecture

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Axios, React Router v6, Lucide Icons
- **Backend API**: FastAPI, Uvicorn, SQLAlchemy ORM, Neon PostgreSQL / SQLite, Pydantic v2
- **Authentication**: JWT Bearer Tokens, PBKDF2-HMAC-SHA256 password hashing
- **Deep Learning Engine**: PyTorch, `torchvision` (EfficientNet-B0 transfer learning)
- **Explainable AI (XAI)**: Grad-CAM (Gradient-weighted Class Activation Mapping)
- **LLM Medical Reports**: Google Gemini API (`gemini-1.5-flash`) with local fallback support
- **PDF Report Engine**: ReportLab PDF generator

---

## 📁 Directory Structure

```text
MediVision AI/
├── backend/                # FastAPI Application & AI Pipeline
│   ├── app/
│   │   ├── api/            # REST Endpoints (auth, settings, analysis, history, statistics, reports)
│   │   ├── core/           # Config, database, security (JWT & hashing), logging
│   │   ├── llm/            # Gemini LLM client & report generator
│   │   ├── ml/             # PyTorch models, datasets, predictor
│   │   ├── models/         # SQLAlchemy ORM models (User, UserSettings, MedicalScan)
│   │   ├── reports/        # ReportLab PDF report generator
│   │   ├── schemas/        # Pydantic auth and analysis schemas
│   │   ├── services/       # PyTorch model service
│   │   ├── xai/            # Grad-CAM heatmap engine
│   │   └── main.py         # FastAPI entrypoint
├── frontend/               # React + TypeScript + Vite Application
│   ├── src/
│   │   ├── components/     # UI Components (Navbar, Sidebar, Footer, ProtectedRoute)
│   │   ├── context/        # AuthContext state provider
│   │   ├── pages/          # Home, Login, Register, Analysis, Dashboard, Profile, Settings, Help
│   │   ├── routes/         # AppRoutes with ProtectedRoute wrappers
│   │   ├── services/       # Axios API Client with JWT interceptors
│   │   ├── types/          # TypeScript interfaces
│   │   ├── App.tsx
│   │   └── main.tsx
└── README.md
```

---

## 📡 REST API Reference

| Endpoint | Method | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `/api/v1/auth/register` | `POST` | No | Register new user account |
| `/api/v1/auth/login` | `POST` | No | User authentication & JWT token issuance |
| `/api/v1/auth/me` | `GET` | Yes | Get current user profile & scan statistics |
| `/api/v1/auth/me` | `PUT` | Yes | Update user full name |
| `/api/v1/auth/change-password` | `PUT` | Yes | Change password |
| `/api/v1/auth/me/delete` | `POST` | Yes | Delete user account & purge user scans |
| `/api/v1/settings` | `GET` | Yes | Fetch user application preferences |
| `/api/v1/settings` | `PUT` | Yes | Update user application preferences |
| `/api/v1/analysis` | `POST` | Yes | Upload & analyze chest X-ray scan |
| `/api/v1/history` | `GET` | Yes | Query user's scan history (paginated) |
| `/api/v1/statistics` | `GET` | Yes | Fetch user's dashboard statistics |
| `/api/v1/reports/{id}/pdf` | `GET` | Yes | Download PDF medical report |

---

## 📄 License

MIT License.
