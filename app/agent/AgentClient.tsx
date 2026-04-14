"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { Project } from "@/lib/types";
import Sidebar from "@/app/components/Sidebar";
import { Send, Bot, User, Loader2, AlertCircle } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "jarvis";
  content: string;
  timestamp: Date;
  error?: boolean;
}

interface AgentClientProps {
  initialProjects: Project[];
  taskCountsByProject: Record<string, number>;
}

export default function AgentClient({
  initialProjects,
  taskCountsByProject,
}: AgentClientProps) {
  const [projects] = useState<Project[]>(initialProjects);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "jarvis",
      content: "Hej Leopold. Vad kan jag hjälpa dig med?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [online, setOnline] = useState<boolean | null>(null);
  const [model, setModel] = useState<string>("anthropic/claude-sonnet-4-6");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const taskCounts = useMemo(
    () => taskCountsByProject,
    [taskCountsByProject]
  );

  useEffect(() => {
    fetch("/api/jarvis/status")
      .then((r) => r.json())
      .then((d) => {
        setOnline(d.online);
        if (d.model) setModel(d.model);
      })
      .catch(() => setOnline(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/jarvis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      const data = await res.json();

      const jarvisMsg: Message = {
        id: crypto.randomUUID(),
        role: "jarvis",
        content: res.ok
          ? data.reply || "Inget svar"
          : `Fel: ${data.error || "Okänt fel"}`,
        timestamp: new Date(),
        error: !res.ok,
      };

      setMessages((prev) => [...prev, jarvisMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "jarvis",
          content:
            "Kunde inte nå Jarvis. Kontrollera att gateway:n är igång.",
          timestamp: new Date(),
          error: true,
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-sand">
      <Sidebar
        projects={projects}
        selectedProject={selectedProject}
        onSelectProject={setSelectedProject}
        taskCounts={taskCounts}
      />

      <div className="flex flex-col flex-1 min-w-0 h-full">
        <div className="px-4 sm:px-6 py-3 bg-white border-b border-sand-dark flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-lg font-display text-stone-dark">Jarvis</h1>
            <p className="text-[10px] font-mono text-stone mt-0.5 truncate max-w-[200px] sm:max-w-md">
              {model}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {online === null && (
              <span className="flex items-center gap-1.5 text-[10px] font-mono text-stone">
                <Loader2 size={11} className="animate-spin" />
                status…
              </span>
            )}
            {online === true && (
              <span className="flex items-center gap-1.5 text-[10px] font-mono text-moss">
                <span className="w-1.5 h-1.5 rounded-full bg-moss animate-pulse" />
                online
              </span>
            )}
            {online === false && (
              <span className="flex items-center gap-1.5 text-[10px] font-mono text-rust">
                <span className="w-1.5 h-1.5 rounded-full bg-rust" />
                offline
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3 scrollbar-thin min-h-0">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "jarvis" && (
                <div className="w-6 h-6 rounded-full bg-sea/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot size={12} className="text-sea" />
                </div>
              )}

              <div
                className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-sea text-white rounded-tr-sm"
                    : msg.error
                      ? "bg-rust/10 text-rust border border-rust/20 rounded-tl-sm"
                      : "bg-white text-stone-dark border border-sand-dark rounded-tl-sm"
                }`}
              >
                {msg.error && (
                  <AlertCircle size={11} className="inline mr-1 mb-0.5" />
                )}
                <span className="whitespace-pre-wrap">{msg.content}</span>
                <div
                  className={`text-[9px] font-mono mt-1 ${
                    msg.role === "user"
                      ? "text-white/60 text-right"
                      : "text-stone"
                  }`}
                >
                  {msg.timestamp.toLocaleTimeString("sv-SE", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>

              {msg.role === "user" && (
                <div className="w-6 h-6 rounded-full bg-sea flex items-center justify-center shrink-0 mt-0.5">
                  <User size={12} className="text-white" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-2 justify-start">
              <div className="w-6 h-6 rounded-full bg-sea/10 flex items-center justify-center shrink-0">
                <Bot size={12} className="text-sea" />
              </div>
              <div className="bg-white border border-sand-dark rounded-2xl rounded-tl-sm px-3 py-2">
                <div className="flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-stone animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-stone animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-stone animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <div className="px-4 sm:px-6 py-3 bg-white border-t border-sand-dark shrink-0">
          <div className="flex gap-2 items-end max-w-3xl mx-auto w-full">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Skriv till Jarvis… (Enter skickar, Shift+Enter ny rad)"
              rows={1}
              className="flex-1 resize-none bg-sand rounded-xl px-3 py-2.5 text-sm text-stone-dark placeholder:text-stone focus:outline-none focus:ring-2 focus:ring-sea/30 scrollbar-thin min-w-0"
              style={{ minHeight: "44px", maxHeight: "120px" }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = Math.min(el.scrollHeight, 120) + "px";
              }}
            />
            <button
              type="button"
              onClick={() => void sendMessage()}
              disabled={!input.trim() || loading}
              className="w-10 h-10 rounded-xl bg-sea text-white flex items-center justify-center hover:bg-sea-dark transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              {loading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Send size={15} />
              )}
            </button>
          </div>
          <p className="text-[9px] font-mono text-stone mt-1.5 max-w-3xl mx-auto">
            Meddelanden via{" "}
            <span className="text-sea">jarvis.sibbjansops.com</span>
          </p>
        </div>
      </div>
    </div>
  );
}
