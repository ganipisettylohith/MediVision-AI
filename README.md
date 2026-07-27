# 🩺 MediVision AI

An intelligent medical imaging platform combining deep learning classification, Grad-CAM visual explainability, and Large Language Model (LLM) clinical report generation.

![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![PyTorch](https://img.shields.io/badge/PyTorch-2.2+-EE4C2C?style=for-the-badge&logo=pytorch&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.2+-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4+-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)

---

## 📌 Project Overview

**MediVision AI** addresses a major challenge in medical image interpretation: bridging the gap between raw computer vision outputs and clear, actionable clinical insights. 

While deep learning classifiers achieve high accuracy on medical images, standard outputs—such as raw class probabilities or numerical scores—offer little context to non-specialists and clinical staff. MediVision AI combines deep neural networks with **Explainable AI (Grad-CAM)** and **Google Gemini LLM synthesis** to produce visual heatmaps and structured diagnostic reports in clear language.

### Key Problem Solved
- **Black-box AI output**: Standard neural networks output predictions without highlighting which image regions led to the result. Grad-CAM visualizes exact spatial attention maps on the scan.
- **Complex medical reports**: Raw probabilities are converted into structured diagnostic reports detailing observations, clinical findings, confidence breakdowns, and suggested next steps.
- **Multimodal support**: Chest X-Rays undergo local PyTorch transfer-learning inference, while other modalities (CT, MRI, Ultrasound) are routed to vision-capable multimodal LLM analysis.

> ⚠️ **Clinical Disclaimer**: MediVision AI is developed strictly for educational, research, and technical evaluation purposes. It is intended to support workflow exploration and must not replace professional medical judgment, diagnosis, or treatment.

---

## ✨ Features

- 📸 **Multi-Modality Image Analysis**: Supports Chest X-Rays, CT scans, MRI, Mammography, and Ultrasound imaging formats.
- 🧠 **PyTorch Transfer Learning Pipeline**: Runs local classification using EfficientNet-B0 and DenseNet-121 backbones trained for diagnostic detection.
- 🔥 **Grad-CAM Explainable AI (XAI)**: Generates gradient-weighted class activation heatmaps overlaying the original scan to reveal spatial regions of diagnostic focus.
- 📄 **Automated Clinical LLM Reports**: Integrates Google Gemini (`gemini-1.5-flash`) to generate structured medical reports including Findings, Impressions, Confidence Rating, and Recommendations.
- ⬇️ **Exportable PDF Reports**: Built-in ReportLab generator produces downloadable clinical PDF diagnostic reports for any analyzed scan.
- 📊 **Telemetry & Analytics Dashboard**: Real-time stats dashboard tracking total scans analyzed, normal vs. abnormal distribution, average confidence, and weekly usage.
- 🔍 **Historical Record Search & Filtering**: Paginated history table supporting live search by Patient ID or filename, filter by diagnosis, and date sorting.
- ⚡ **Asynchronous REST API**: Powered by FastAPI with automated OpenAPI standard documentation and CORS controls.

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18 (TypeScript)
- **Build Tool**: Vite
- **Styling**: Vanilla CSS, Tailwind CSS (Glassmorphism design tokens)
- **Icons & Routing**: Lucide React, React Router DOM v6
- **HTTP Client**: Axios

### Backend
- **Framework**: Python 3.10+, FastAPI, Uvicorn
- **ORM & Database**: SQLAlchemy 2.0, SQLite / PostgreSQL (`psycopg2-binary`)
- **Data Validation**: Pydantic v2
- **PDF Generation**: ReportLab

### Artificial Intelligence & Machine Learning
- **Deep Learning Framework**: PyTorch 2.2+, Torchvision
- **Model Architectures**: EfficientNet-B0, DenseNet-121
- **Computer Vision & Heatmaps**: OpenCV (`cv2`), NumPy, SciPy, Pillow, Matplotlib
- **Large Language Model (LLM)**: Google Gemini API (`google-generativeai`, `gemini-1.5-flash`), `httpx`

### DevOps & Tooling
- **Containerization**: Docker, Docker Compose
- **Configuration & Environment**: `pydantic-settings`, `python-dotenv`
- **Deployment Spec**: `render.yaml`

---

## 📐 System Architecture

The following diagram illustrates the end-to-end data pipeline from user image upload to deep learning classification, heatmap extraction, LLM report generation, and database persistence:

```
                          ┌───────────────────────────┐
                          │   User Medical Scan Image │
                          └─────────────┬─────────────┘
                                        │
                                        ▼
                          ┌───────────────────────────┐
                          │ FastAPI Endpoint Upload  │
                          └─────────────┬─────────────┘
                                        │
                                        ▼
                          ┌───────────────────────────┐
                          │ Image Validation & Preproc│
                          └─────────────┬─────────────┘
                                        │
                ┌───────────────────────┴───────────────────────┐
                │                                               │
                ▼ (Chest X-Ray)                                 ▼ (CT / MRI / Ultrasound)
  ┌───────────────────────────┐                   ┌───────────────────────────┐
  │ Local PyTorch Deep Model  │                   │ Google Gemini Vision API  │
  │ (EfficientNet / DenseNet) │                   └─────────────┬─────────────┘
  └─────────────┬─────────────┘                                 │
                │                                               │
                ▼                                               │
  ┌───────────────────────────┐                                 │
  │ Grad-CAM Heatmap Extractor│                                 │
  │ (Target Conv Layer Grads) │                                 │
  └─────────────┬─────────────┘                                 │
                │                                               │
                └───────────────────────┬───────────────────────┘
                                        │
                                        ▼
                          ┌───────────────────────────┐
                          │ Google Gemini LLM Engine  │
                          │ (Clinical Synthesis Prompt)│
                          └─────────────┬─────────────┘
                                        │
                                        ▼
                          ┌───────────────────────────┐
                          │ Structured Report & PDF   │
                          │ Persistence (SQLite / Postgres)
                          └───────────────────────────┘
```

---

## 🤖 AI & Computer Vision Pipeline

```
  Medical Image Upload ──► Image Normalization ──► PyTorch Forward Pass ──► Grad-CAM Backprop ──► Heatmap Overlay ──► Gemini LLM Synthesis ──► Clinical PDF Report
```

1. **Image Preprocessing & Normalization**: The input image is converted to standard RGB format, resized to $224 \times 224$, and normalized using ImageNet mean ($\mu = [0.485, 0.456, 0.406]$) and standard deviation ($\sigma = [0.229, 0.224, 0.225]$).
2. **PyTorch Deep Learning Classification**: The tensor passes through an EfficientNet-B0 / DenseNet-121 backbone modified with custom linear dropout heads. The model outputs class logits and softmax confidence scores.
3. **Grad-CAM Heatmap Extraction**:
   - Forward pass captures final convolutional layer activations ($A^k$).
   - Backward pass calculates gradients of score $y^c$ with respect to feature maps:
     $$\alpha_k^c = \frac{1}{Z} \sum_{i} \sum_{j} \frac{\partial y^c}{\partial A_{i,j}^k}$$
   - Coarse heatmaps are computed via ReLU weighting: $L_{\text{Grad-CAM}}^c = \text{ReLU}\left(\sum_k \alpha_k^c A^k\right)$, then upsampled and colormapped (JET) over the original scan.
4. **LLM Synthesis**: Classification scores, class probabilities, and Grad-CAM spatial notes are passed into Google Gemini (`gemini-1.5-flash`) via structured JSON schema prompts to generate clinical diagnostic summaries.

---

## 📁 Project Structure

```
MediVision-AI/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── endpoints/
│   │   │       │   ├── analysis.py       # Scan upload & processing endpoint
│   │   │       │   ├── auth.py           # User profile management API
│   │   │       │   ├── health.py         # System health checks
│   │   │       │   ├── history.py        # Historical scan search & filters
│   │   │       │   ├── predict.py        # Inference pipeline API
│   │   │       │   ├── reports.py        # PDF report download endpoint
│   │   │       │   ├── settings.py       # User preferences API
│   │   │       │   └── statistics.py     # Usage telemetry analytics
│   │   │       └── router.py             # API route aggregator
│   │   ├── core/
│   │   │   ├── config.py                 # Pydantic environment configuration
│   │   │   ├── database.py               # SQLAlchemy database session manager
│   │   │   ├── logging_config.py         # Structured logging configuration
│   │   │   └── security.py               # Password hashing & auth helpers
│   │   ├── llm/
│   │   │   ├── gemini_client.py          # Google Gemini API client & fallback
│   │   │   ├── prompt_builder.py         # Medical report prompt templates
│   │   │   └── report_generator.py       # Report synthesis coordinator
│   │   ├── ml/
│   │   │   ├── config.py                 # Machine learning hyperparameters
│   │   │   ├── dataset.py                # PyTorch Dataset loaders
│   │   │   ├── evaluator.py              # Model validation evaluation
│   │   │   ├── metrics.py                # Classification metric utilities
│   │   │   ├── model.py                  # EfficientNet-B0 / DenseNet-121 architectures
│   │   │   ├── predictor.py              # PyTorch model inference service
│   │   │   └── trainer.py                # Model training routines
│   │   ├── models/
│   │   │   ├── medical_image.py          # Medical scan database schema
│   │   │   └── user.py                   # User database schema
│   │   ├── reports/
│   │   │   └── pdf_generator.py          # ReportLab PDF generator engine
│   │   ├── schemas/
│   │   │   ├── analysis.py               # Pydantic schemas for analysis requests
│   │   │   ├── auth_schemas.py           # Pydantic schemas for auth/profile
│   │   │   └── health.py                 # Health check schema
│   │   ├── services/
│   │   │   └── model_service.py          # Model initialization & singleton service
│   │   ├── xai/
│   │   │   ├── explainer.py              # XAI orchestration wrapper
│   │   │   ├── gradcam.py                # Grad-CAM hook implementation
│   │   │   └── utils.py                  # Heatmap blending & image utilities
│   │   └── main.py                       # FastAPI application entrypoint
│   ├── requirements.txt                  # Backend Python dependencies
│   └── alembic.ini                       # Database migration config
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/
│   │   │   │   └── ErrorBoundary.tsx     # React runtime error boundary
│   │   │   └── layout/
│   │   │       ├── Footer.tsx            # App footer component
│   │   │       ├── Navbar.tsx            # Top header navigation
│   │   │       └── Sidebar.tsx           # Side navigation panel
│   │   ├── context/
│   │   │   └── AuthContext.tsx           # Global state provider
│   │   ├── pages/
│   │   │   ├── AnalysisPage.tsx          # Scan upload & AI diagnostic page
│   │   │   ├── DashboardPage.tsx         # Scan history & analytics dashboard
│   │   │   ├── HelpPage.tsx              # System documentation page
│   │   │   ├── HomePage.tsx              # Landing hero page
│   │   │   ├── NotFoundPage.tsx          # 404 handler page
│   │   │   └── SettingsPage.tsx          # User preferences page
│   │   ├── routes/
│   │   │   └── AppRoutes.tsx             # React router configuration
│   │   ├── services/
│   │   │   └── api.ts                    # Axios API service client
│   │   ├── types/
│   │   │   └── index.ts                  # TypeScript interfaces & types
│   │   ├── App.tsx                       # Main React App layout container
│   │   └── main.tsx                      # React root rendering entrypoint
│   ├── package.json                      # Frontend Node dependencies
│   └── vite.config.ts                    # Vite build configuration
├── docker-compose.yml                    # Multi-container container setup
├── render.yaml                           # Cloud platform deployment spec
├── start-local.bat                       # One-click Windows startup script
└── README.md                             # Project documentation
```

---

## ⚡ Installation & Local Setup

### Prerequisites
- **Python**: Version 3.10 or higher
- **Node.js**: Version 18.0 or higher (`npm` included)
- **Git**

### 1. Clone the Repository
```bash
git clone https://github.com/ganipisettylohith/MediVision-AI.git
cd MediVision-AI
```

### 2. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# macOS / Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# (Optional) Configure Gemini API Key in .env file
# Create a .env file in backend/ directory:
echo GEMINI_API_KEY=your_google_gemini_api_key_here > .env

# Run backend development server
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
*The Backend API will be available at:* **`http://localhost:8000`** *(Swagger documentation at `http://localhost:8000/docs`)*.

### 3. Frontend Setup
Open a **second terminal window**:

```bash
# Navigate to frontend directory
cd frontend

# Install Node dependencies
npm install

# Start Vite development server
npm run dev
```
*The Frontend Application will be available at:* **`http://localhost:5173`**.

---

### 🐳 Running with Docker

Alternatively, launch both services using Docker Compose:

```bash
docker-compose up --build
```

---

## 🖼️ Application Screenshots

### Home Page
![Home Page](screenshots/home.png)
*Landing page providing an overview of diagnostic features and quick navigation links.*

---

### AI Scan Diagnostics & Upload
![Scan Analysis Page](screenshots/analysis.png)
*Upload interface supporting chest scan file selection, patient ID tagging, PyTorch classification execution, and Grad-CAM heatmap visualization.*

---

### Diagnostic Dashboard & Analytics
![Dashboard Page](screenshots/dashboard.png)
*Telemetry dashboard showing total scan counts, diagnosis breakdowns, confidence averages, search filters, and record exports.*

---

## 💡 Key Learnings

- **PyTorch Transfer Learning**: Fine-tuning pre-trained convolutional backbones (EfficientNet-B0 / DenseNet-121) for medical imaging tasks using custom classification heads and dropout layers.
- **Hook-based Gradient Extraction**: Implementing PyTorch forward and full-backward hooks on specific convolutional feature layers (`features[-1]`) to calculate spatial class activation weights without altering original network weights.
- **LLM Medical Prompt Engineering**: Structuring JSON schema prompts to constrain Gemini LLM responses to strict clinical formats, while gracefully defaulting to local template generators during API rate limits or offline states.
- **Full-Stack AI Integration**: Connecting Python ML services, FastAPI async endpoints, SQLite database persistence, and React TypeScript frontend components with real-time UI state management.

---

## 🔮 Future Enhancements

- [ ] **Native DICOM Parsing**: Direct parsing of `.dcm` metadata and 16-bit windowing adjustments directly in the browser and backend.
- [ ] **Multi-Label Pathology Models**: Expanding the PyTorch classifier to support simultaneous multi-label detection (e.g., Effusion, Cardiomegaly, Atelectasis).
- [ ] **PDF Report Customization**: Adding signature fields, hospital logo customization, and physician note inputs before export.
- [ ] **Cloud Storage Integration**: Storing uploaded scans and generated heatmaps in AWS S3 or Google Cloud Storage.

---

## 🤝 Contributing

Contributions are welcome! If you find a bug or have a feature suggestion, feel free to open an issue or submit a pull request.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.

---

## ✉️ Contact & Links

**Lohith Ganipisetty**

- **GitHub**: [github.com/ganipisettylohith](https://github.com/ganipisettylohith)
- **Project Repository**: [https://github.com/ganipisettylohith/MediVision-AI](https://github.com/ganipisettylohith/MediVision-AI)
- **LinkedIn**: [LinkedIn Profile](https://linkedin.com/in/) *(Add your link here)*
