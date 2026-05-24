# from langchain.document_loaders import DirectoryLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from langchain_community.document_loaders import PyPDFLoader
from langchain_community.vectorstores import Chroma
from dotenv import load_dotenv
import os
import shutil
from pathlib import Path
from langchain_community.embeddings import HuggingFaceEmbeddings



# Load environment variables. Assumes that project contains .env file with API keys
load_dotenv()


CHROMA_DB_DIR = "chroma_db"
DATA_PATH = "data"

# =========================
# EMBEDDING MODEL
# =========================

embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)


def main():
    generate_data_store()


def generate_data_store():
    documents = load_documents()
    chunks = split_text(documents)
    save_to_chroma(chunks)


def load_documents():
    documents: list[Document] = []
    for path in Path(DATA_PATH).glob("*.pdf"):
        loader = PyPDFLoader(str(path))
        documents.extend(loader.load())
    return documents


def split_text(documents: list[Document]):
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=300,
        chunk_overlap=100,
        length_function=len,
        add_start_index=True,
    )
    chunks = text_splitter.split_documents(documents)
    print(f"Split {len(documents)} documents into {len(chunks)} chunks.")

    if chunks:
        sample_index = min(10, len(chunks) - 1)
        document = chunks[sample_index]
        print(document.page_content)
        print(document.metadata)

    return chunks


def save_to_chroma(chunks: list[Document]):
    # # Clear out the database first.
    # if os.path.exists(CHROMA_DB_DIR):
    #     shutil.rmtree(CHROMA_DB_DIR)

    # Create a new DB from the documents.
    vector_store = Chroma(
        collection_name='company_policies',
        persist_directory=CHROMA_DB_DIR,
        embedding_function=embeddings
    )
    
    # -------------------------
    # STORE EMBEDDINGS
    # -------------------------

    vector_store.add_documents(chunks)
    print(f"Saved chunks to {CHROMA_DB_DIR}.")


if __name__ == "__main__":
    main()
