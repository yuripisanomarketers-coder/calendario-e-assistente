"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";

interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

const STORAGE_KEY = "assistente-chat";

const SUGGESTIONS = [
  "Cosa ho in programma oggi?",
  "Riassumi le email non lette importanti",
  "Ci sono messaggi Slack a cui devo rispondere?",
  "Trovami un'ora libera giovedì per una call",
];

export function Chat() {
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- ripristino una tantum da localStorage
      if (saved) setMessages(JSON.parse(saved) as ChatTurn[]);
    } catch {
      // storage non disponibile: si parte da una chat vuota
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // ignora
    }
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || loading) return;
    const next: ChatTurn[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.slice(-40) }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok || !data.reply) throw new Error(data.error ?? "Errore sconosciuto");
      setMessages([...next, { role: "assistant", content: data.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore di rete");
      // Rimuove il messaggio non riuscito e lo rimette nel campo di testo.
      setMessages(messages);
      setInput(content);
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void send(input);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void send(input);
    }
  }

  return (
    <section className="flex h-[70vh] flex-col rounded-2xl border border-border bg-card shadow-sm lg:h-[calc(100vh-7rem)]">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Assistente</h2>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={() => setMessages([])}
            className="text-xs text-muted hover:text-foreground"
          >
            Nuova chat
          </button>
        )}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <p className="text-sm text-muted">
              Chiedimi del tuo calendario, delle email o di Slack.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => void send(suggestion)}
                  className="rounded-full border border-border px-3 py-1.5 text-xs hover:bg-background"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message, i) => (
          <div
            key={i}
            className={message.role === "user" ? "flex justify-end" : "flex justify-start"}
          >
            <div
              className={
                message.role === "user"
                  ? "max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-accent px-4 py-2 text-sm text-accent-foreground"
                  : "max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-background px-4 py-2 text-sm"
              }
            >
              {message.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm bg-background px-4 py-2 text-sm text-muted">
              <span className="animate-pulse">Sto lavorando…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="mx-5 mb-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <form onSubmit={onSubmit} className="flex items-end gap-2 border-t border-border p-3">
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder="Scrivi un messaggio…"
          className="max-h-40 min-h-10 flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="h-10 rounded-xl bg-accent px-4 text-sm font-medium text-accent-foreground transition hover:opacity-90 disabled:opacity-40"
        >
          Invia
        </button>
      </form>
    </section>
  );
}
