from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from werkzeug.utils import secure_filename
import re

# LangChain imports
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import (
    PyPDFLoader,
    TextLoader,
    Docx2txtLoader
)

from langchain_chroma import Chroma
from langchain_community.embeddings import HuggingFaceEmbeddings


import google.generativeai as genai
from dotenv import load_dotenv

app = Flask(__name__)
CORS(
    app,
    resources={
        r"/*": {
            "origins": [
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "https://rag-application-roan.vercel.app"
            ]
        }
    }
)

load_dotenv()

# =========================
# LLM configuration
# =========================

genai.configure(
    api_key=os.getenv("GEMINI_API_KEY")
)

model = genai.GenerativeModel("gemini-2.5-flash")


# =========================
# CONFIG
# =========================

UPLOAD_FOLDER = "uploads"
CHROMA_DB_DIR = "chroma_db"

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(CHROMA_DB_DIR, exist_ok=True)

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

# =========================
# EMBEDDING MODEL
# =========================

_embeddings = None


def get_embeddings():
    global _embeddings

    if _embeddings is None:
        _embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2"
        )

    return _embeddings


# =========================
# HELPER FUNCTION
# =========================

def load_document(file_path):

    extension = os.path.splitext(file_path)[1].lower()

    if extension == ".pdf":
        loader = PyPDFLoader(file_path)

    elif extension == ".txt":
        loader = TextLoader(file_path, encoding="utf-8")

    elif extension == ".docx":
        loader = Docx2txtLoader(file_path)

    else:
        raise ValueError("Unsupported file type")

    documents = loader.load()

    return documents


def to_collection_name(email_id: str) -> str:
    safe_id = re.sub(r"[^a-zA-Z0-9._-]", "_", email_id)
    safe_id = safe_id.strip("._-")

    if len(safe_id) < 3:
        safe_id = f"user_{safe_id}" if safe_id else "user_default"

    if len(safe_id) > 512:
        safe_id = safe_id[:512]

    return f"user_{safe_id}"


# =========================
# UPLOAD API
# =========================

@app.route("/upload", methods=["POST"])
def upload_document():

    try:

        # -------------------------
        # GET USER ID
        # -------------------------

        email_id = request.form.get("email_id")

        if not email_id:
            return jsonify({
                "error": "email_id is required"
            }), 400

        # -------------------------
        # GET FILE
        # -------------------------

        if "file" not in request.files:
            return jsonify({
                "error": "No file uploaded"
            }), 400

        file = request.files["file"]

        if file.filename == "":
            return jsonify({
                "error": "Empty filename"
            }), 400

        # -------------------------
        # SAVE FILE
        # -------------------------

        filename = secure_filename(file.filename)

        file_path = os.path.join(
            app.config["UPLOAD_FOLDER"],
            filename
        )

        file.save(file_path)

        # -------------------------
        # LOAD DOCUMENT
        # -------------------------

        documents = load_document(file_path)

        # -------------------------
        # SPLIT DOCUMENT
        # -------------------------

        splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200
        )

        chunks = splitter.split_documents(documents)

        # -------------------------
        # CREATE COLLECTION
        # -------------------------

        collection_name = to_collection_name(email_id)

        vector_store = Chroma(
            collection_name=collection_name,
            persist_directory=CHROMA_DB_DIR,
            embedding_function=get_embeddings()
        )

        # -------------------------
        # STORE EMBEDDINGS
        # -------------------------

        vector_store.add_documents(chunks)

        return jsonify({
            "message": "Document uploaded successfully",
            "chunks_stored": len(chunks),
            "collection": collection_name
        })

    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500


# =========================
# CHAT API
# =========================

@app.route("/chat", methods=["POST"])
def chat():

    try:

        data = request.get_json()

        email_id = data.get("email_id")
        question = data.get("question")

        if not email_id or not question:
            return jsonify({
                "error": "email_id and question are required"
            }), 400

        # -------------------------
        # LOAD USER COLLECTION
        # -------------------------

        collection_name = (
            "company_policies"
            if email_id == "company_policies"
            else to_collection_name(email_id)
        )

        vector_store = Chroma(
            collection_name=collection_name,
            persist_directory=CHROMA_DB_DIR,
            embedding_function=get_embeddings()
        )

        # -------------------------
        # RETRIEVER
        # -------------------------

        retriever = vector_store.as_retriever(
            search_kwargs={"k": 4}
        )

        relevant_docs = retriever.invoke(
            question
        )

        # -------------------------
        # CREATE CONTEXT
        # -------------------------

        context = "\n\n".join([
            doc.page_content
            for doc in relevant_docs
        ])

        # -------------------------
        # PROMPT
        # -------------------------

        prompt = f"""
You are a helpful AI assistant.

Answer the user's question ONLY using the provided context.

If answer is not available in context,
say:
"I could not find relevant information in the documents."

CONTEXT:
{context}

QUESTION:
{question}
"""

        # -------------------------
        # GEMINI RESPONSE
        # -------------------------

        response = model.generate_content(prompt)

        answer = response.text

        return jsonify({
            "question": question,
            "answer": answer,
            "retrieved_chunks": len(relevant_docs)
        })

    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500
    

# =========================
# RUN SERVER
# =========================

if __name__ == "__main__":
    app.run(debug=True)