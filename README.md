# RAG App 01

A two-mode RAG app with a Flask backend and a Next.js frontend. The Enterprise Knowledge tab answers questions from a prebuilt HR policy knowledge base. The Personal Workspace tab lets users upload documents and chat against their own indexed content.

## Features

- Enterprise knowledge base from PDFs (Chroma collection: company_policies)
- Personal document upload and chat per user collection
- Gemini responses grounded in retrieved context
- Clean, responsive UI with tabbed navigation

## Tech Stack

- Backend: Flask, LangChain, Chroma, Hugging Face embeddings, Gemini
- Frontend: Next.js (App Router), React, Tailwind CSS

## Project Structure

- backend/app.py: Flask API for upload and chat
- backend/rag/create_database.py: Build the enterprise knowledge base
- backend/requirements.txt: Python dependencies
- backend/chroma_db/: Chroma persistence directory
- backend/uploads/: Uploaded files
- frontend/app/page.tsx: Main UI
- frontend/app/globals.css: Styling and theme

## Setup

### 1) Backend

Create a .env file in backend/ with:

- GOOGLE_API_KEY=your_gemini_api_key
- HF_TOKEN=your_huggingface_token (optional, for faster model downloads)

Install dependencies and start the API server:

```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

The backend runs at http://localhost:5000.

### 2) Build the enterprise knowledge base (optional)

Place your HR policy PDF(s) in backend/data/ and run:

```bash
cd backend
python rag/create_database.py
```

This creates/updates the company_policies collection in backend/chroma_db/.

### 3) Frontend

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at http://localhost:3000.

## Environment Variables

Backend (.env in backend/):

- GOOGLE_API_KEY: Gemini API key
- HF_TOKEN: Hugging Face token (optional)

Frontend (.env.local in frontend/, optional):

- NEXT_PUBLIC_API_BASE_URL: Backend base URL (default: http://localhost:5000)

## API Endpoints

- POST /upload
  - Form data: email_id, file
  - Creates a user collection named user_<email_id>

- POST /chat
  - JSON: { "email_id": string, "question": string }
  - Uses company_policies if email_id is company_policies
  - Otherwise uses user_<email_id>

## Notes

- CORS is enabled for http://localhost:3000 and http://127.0.0.1:3000.
- The Personal Workspace tab is intended for uploads; the Enterprise tab reads the prebuilt knowledge base.
