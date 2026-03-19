"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { isAxiosError } from "axios";

import { Button } from "@/components/ui/button";
import { ArrowLeft, Send, Bot } from "lucide-react";

type Message = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Monte um treino para mim",
  "Como melhorar meu sono?",
  "Dicas de alimentação pré-treino",
  "Como interpretar minha evolução?",
];

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
        <Bot className="h-4 w-4" />
      </div>
      <div className="rounded-2xl rounded-bl-sm bg-card px-4 py-3 shadow-sm">
        <span className="flex gap-1 items-center">
          <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]" />
          <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]" />
          <span className="h-2 w-2 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]" />
        </span>
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Olá! Sou seu assistente. Posso te ajudar com treinos, dieta, sono e muito mais. Como posso te ajudar hoje?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    setInput("");
    setErr(null);
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);
    try {
      const res = await api.post<{ answer: string }>("/ai/chat", { message: text }, { withCredentials: true });
      setMessages((prev) => [...prev, { role: "assistant", content: res.data.answer }]);
    } catch (error) {
      let msg = "Erro ao obter resposta. Tente novamente.";
      if (isAxiosError(error)) msg = error.response?.data?.error || msg;
      setErr(msg);
      setMessages((prev) => prev.slice(0, -1));
      setInput(text);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    await sendMessage(input.trim());
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e as unknown as FormEvent);
    }
  }

  return (
    <div className="flex flex-col h-svh bg-background text-foreground">
      {/* Header fixo */}
      <header className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border/30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Button asChild variant="outline" size="sm" className="shrink-0 bg-card/90 hover:bg-accent border-border/30 shadow-sm">
          <Link href="/app/home">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-primary">
            <Bot className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">Assistente IA</p>
            <p className="text-xs text-muted-foreground">Fitness personalizado</p>
          </div>
        </div>
      </header>

      {/* Lista de mensagens */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex items-end gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
          >
            {msg.role === "assistant" && (
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                <Bot className="h-4 w-4" />
              </div>
            )}
            <div
              className={`max-w-[80%] sm:max-w-[70%] px-4 py-3 rounded-2xl shadow-sm whitespace-pre-wrap text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-card text-foreground rounded-bl-sm"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {messages.length === 1 && !loading && (
          <div className="flex flex-wrap gap-2 mt-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                className="rounded-full border border-border/40 bg-card px-3 py-1.5 text-xs text-foreground/80 hover:bg-muted hover:text-foreground transition"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {loading && <TypingIndicator />}

        {err && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/15 px-3 py-2 text-sm text-destructive text-center">
            {err}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input fixo na parte inferior */}
      <div className="shrink-0 border-t border-border/30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 py-3">
        <form onSubmit={onSubmit} className="flex items-end gap-2 max-w-3xl mx-auto">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Digite sua mensagem..."
            maxLength={4000}
            disabled={loading}
            className="flex-1 resize-none rounded-xl border border-border/30 bg-background/90 text-foreground placeholder:text-foreground/40 px-4 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50 max-h-40 overflow-y-auto"
            style={{ fieldSizing: "content" } as React.CSSProperties}
          />
          <Button
            type="submit"
            size="icon"
            disabled={loading || !input.trim()}
            className="h-11 w-11 shrink-0 rounded-xl shadow-sm"
          >
            <Send className="h-4 w-4" />
            <span className="sr-only">Enviar</span>
          </Button>
        </form>
       
      </div>
    </div>
  );
}
