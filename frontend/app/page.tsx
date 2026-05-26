"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type UploadResult = {
  message: string;
  chunks_stored: number;
  collection: string;
};

export default function Home() {
  const apiBase = useMemo(
    () => process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://rag-application-production-7bc3.up.railway.app",
    [],
  );
  const [emailId, setEmailId] = useState("company_policies");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadDetails, setUploadDetails] = useState<UploadResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatting, setChatting] = useState(false);
  const [activeTab, setActiveTab] = useState<"enterprise" | "personal">(
    "enterprise",
  );

  const handleUpload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setUploadStatus(null);
    setUploadDetails(null);

    if (emailId.trim() !== "company_policies" && emailId.trim() === "") {
      setUploadStatus("Add an email id before uploading.");
      return;
    }
    if (!selectedFile) {
      setUploadStatus("Choose a PDF, DOCX, or TXT file first.");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("email_id", emailId.trim());
      formData.append("file", selectedFile);

      const response = await fetch(`${apiBase}/upload`, {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as
        | UploadResult
        | { error: string };

      console.log("Upload response payload:", payload);
      console.log("Upload response:", response);
      if (!response.ok) {
        setUploadStatus("error" in payload ? payload.error : "Upload failed.");
        return;
      }

      setUploadDetails(payload as UploadResult);
      setUploadStatus("Upload complete. Ready to chat.");
    } catch (error) {
      setUploadStatus(
        error instanceof Error ? error.message : "Something went wrong.",
      );
    } finally {
      setUploading(false);
    }
  };

  const handleChat = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!emailId.trim()) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: "Please enter your email id so I can find your collection.",
        },
      ]);
      return;
    }
    if (!question.trim()) {
      return;
    }

    const prompt = question.trim();
    setQuestion("");
    setChatting(true);
    setMessages((current) => [...current, { role: "user", content: prompt }]);

    try {
      const response = await fetch(`${apiBase}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email_id: emailId.trim(), question: prompt }),
      });

      const payload = (await response.json()) as
        | { answer: string }
        | { error: string };

      if (!response.ok || "error" in payload) {
        setMessages((current) => [
          ...current,
          {
            role: "assistant",
            content:
              "error" in payload ? payload.error : "Chat request failed.",
          },
        ]);
        return;
      }

      setMessages((current) => [
        ...current,
        { role: "assistant", content: payload.answer },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content:
            error instanceof Error ? error.message : "Something went wrong.",
        },
      ]);
    } finally {
      setChatting(false);
    }
  };

  return (
    <div className="page-bg flex flex-1 flex-col">
      <main className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col gap-8 px-4 py-5 sm:px-6 lg:gap-10 lg:px-10 lg:py-6">
        <div className="fade-up flex w-full flex-wrap items-center gap-2 rounded-full border border-[color:var(--border)] bg-[color:var(--panel)] p-2 shadow-[var(--shadow)] sm:gap-3">
          <button
            type="button"
            onClick={() => {
              setActiveTab("enterprise");
              setEmailId("company_policies");
              setMessages([]);
            }}
            className={`flex items-center rounded-full px-5 py-2 text-sm font-semibold transition ${
              activeTab === "enterprise"
                ? "bg-[color:var(--foreground)] text-[color:var(--panel)]"
                : "text-[color:var(--foreground)]/70 hover:text-[color:var(--foreground)]"
            }`}
            aria-pressed={activeTab === "enterprise"}
          >
            Enterprise Knowledge
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("personal");
              setEmailId("");
              setMessages([]);
            }}
            className={`flex items-center rounded-full px-5 py-2 text-sm font-semibold transition ${
              activeTab === "personal"
                ? "bg-[color:var(--foreground)] text-[color:var(--panel)]"
                : "text-[color:var(--foreground)]/70 hover:text-[color:var(--foreground)]"
            }`}
            aria-pressed={activeTab === "personal"}
          >
            Personal Workspace
          </button>
        </div>

        <div className="flex flex-col gap-10 lg:grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <section className="fade-up flex w-full flex-col gap-6">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div className="flex flex-col gap-4">
                <span className="text-xs font-semibold uppercase tracking-[0.4em] text-[color:var(--accent-dark)]">
                  Rag Studio
                </span>
                <h1
                  key={`heading-${activeTab}`}
                  className="fade-up max-w-2xl font-[var(--font-display)] text-3xl leading-tight text-[color:var(--foreground)] sm:text-4xl lg:text-5xl"
                >
                  {activeTab === "enterprise"
                    ? "Ask about leave, termination, notice period, and conduct."
                    : "Upload a document and chat with the knowledge inside it."}
                </h1>
                <div
                  key={`subcopy-${activeTab}`}
                  className="fade-up max-w-xl text-base text-[color:var(--foreground)]/70 sm:text-lg"
                >
                  {activeTab === "enterprise" ? (
                    <p>
                      <Link
                        href="https://drive.google.com/file/d/1kkpXublEd4zR5iRjOcjWm0MQvF_nrtj5/view?usp=sharing"
                        className="text-blue-500 hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        See the source policy PDF.
                      </Link>
                      {" Get clear answers to your HR questions."}
                    </p>
                  ) : (
                    "Upload a PDF, DOCX, or TXT file, then ask grounded questions."
                  )}
                </div>
                <div className="fade-up max-w-2xl rounded-2xl border border-amber-600/70 bg-gradient-to-br from-amber-100 via-amber-50 to-white px-4 py-3 text-xs text-amber-950 shadow-[0_12px_30px_-24px_rgba(120,53,15,0.45)] sm:text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full border border-amber-600/60 bg-amber-200 text-[color:var(--foreground)]">
                      i
                    </span>
                    <span className="text-sm font-semibold uppercase tracking-[0.24em]">
                      Notice
                    </span>
                  </div>
                  <p className="mt-2 text-amber-950/90">
                    This application is deployed on limited free-tier cloud
                    infrastructure for demonstration purposes. Response latency
                    is higher due to constrained compute resources, embedding
                    model initialization, and vector database storage
                    limitations. In a production-scale environment, the system
                    performs significantly faster.
                  </p>
                </div>
              </div>
            </div>

            {activeTab !== "enterprise" && (
              <div className="panel fade-up w-full rounded-[32px] p-6 sm:p-8">
                <h2 className="text-lg font-semibold text-[color:var(--foreground)]">
                  Upload document
                </h2>
                <p className="mt-2 text-sm text-[color:var(--foreground)]/70">
                  Each email id creates its own collection in Chroma.
                </p>
                <form
                  className="mt-6 flex flex-col gap-4"
                  onSubmit={handleUpload}
                >
                  <label className="flex flex-col gap-2 text-sm font-medium">
                    Email id
                    <input
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      value={emailId}
                      onChange={(event) => setEmailId(event.target.value)}
                      placeholder="e.g. example@company.com"
                      className="h-11 rounded-2xl border border-[color:var(--border)] bg-transparent px-4 text-base outline-none transition focus:border-[color:var(--accent)]"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm font-medium">
                    Document file
                    <input
                      type="file"
                      accept=".pdf,.txt,.docx"
                      onChange={(event) =>
                        setSelectedFile(event.target.files?.[0] ?? null)
                      }
                      className="rounded-2xl border border-[color:var(--border)] px-4 py-3 text-sm"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={uploading}
                    className="flex h-12 items-center justify-center rounded-2xl bg-[color:var(--accent)] text-base font-semibold text-white transition hover:bg-[color:var(--accent-dark)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {uploading ? "Uploading..." : "Upload & index"}
                  </button>
                </form>

                <div className="mt-6 space-y-3 text-sm">
                  {uploadStatus && (
                    <div className="rounded-2xl border border-[color:var(--border)] bg-yellow-700 px-4 py-3 text-[color:var(--foreground)]">
                      {uploadStatus}
                    </div>
                  )}
                  {uploadDetails && (
                    <div className="rounded-2xl border border-[color:var(--border)] bg-yellow-800 px-4 py-3 text-[color:var(--foreground)]">
                      <div className="font-semibold">Upload summary</div>
                      <div className="mt-1 text-[color:var(--foreground)]/70">
                        {uploadDetails.chunks_stored} chunks stored in{" "}
                        {uploadDetails.collection}.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          <section className="w-full">
            <div className="panel fade-up w-full rounded-[32px] p-6 sm:p-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-[color:var(--foreground)]">
                    Chat about the document
                  </h2>
                  <p className="mt-2 text-sm text-[color:var(--foreground)]/70">
                    Ask grounded questions. The answer is pulled from your
                    uploaded context.
                  </p>
                </div>
                <span className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs text-[color:var(--foreground)]/70">
                  {messages.length} messages
                </span>
              </div>

              <div className="mt-6 flex min-h-[260px] flex-col gap-4 rounded-[24px] border border-[color:var(--border)] bg-white/70 p-4 sm:min-h-[350px] sm:p-5">
                {messages.length === 0 ? (
                  <div className="text-sm text-[color:black]/50">
                    {activeTab === "enterprise"
                      ? "Ask a question about the company policies to see how it works."
                      : "No messages yet. Upload a document and ask your first question."}
                  </div>
                ) : (
                  messages.map((message, index) => (
                    <div
                      key={`${message.role}-${index}`}
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                        message.role === "user"
                          ? "ml-auto bg-[color:var(--accent)] text-white"
                          : "mr-auto bg-yellow-700 text-[color:var(--foreground)]"
                      }`}
                    >
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] opacity-70">
                        {message.role === "user" ? "You" : "Assistant"}
                      </div>
                      <div className="mt-2 whitespace-pre-line">
                        {message.content}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form className="mt-5 flex flex-col gap-3" onSubmit={handleChat}>
                <textarea
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="Ask a grounded question..."
                  rows={3}
                  className="w-full rounded-2xl border border-[color:var(--border)] bg-transparent px-4 py-3 text-sm outline-none transition focus:border-[color:var(--accent)]"
                />
                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={chatting}
                    className="flex h-11 items-center justify-center rounded-2xl bg-[color:var(--foreground)] px-6 text-sm font-semibold text-[color:var(--panel)] transition hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {chatting ? "Thinking..." : "Send question"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMessages([])}
                    className="flex h-11 items-center justify-center rounded-2xl border border-[color:var(--border)] px-6 text-sm font-semibold text-[color:var(--foreground)] transition hover:border-[color:var(--accent)]"
                  >
                    Clear chat
                  </button>
                </div>
              </form>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
