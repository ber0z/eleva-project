"use client";

import { FormEvent, useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { isAxiosError } from "axios";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Send } from "lucide-react";

type Message = {
  id: number;
  senderType: "user" | "professional";
  content: string;
  createdAt: string;
};

type Partner = {
  id: number;
  name: string;
  profilePicture: string | null;
};

export default function ProConversationPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = Number(params.conversationId);

  const [messages, setMessages] = useState<Message[]>([]);
  const [partner, setPartner] = useState<Partner | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastTimestampRef = useRef<string | null>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Load initial messages
  useEffect(() => {
    async function load() {
      try {
        const res = await api.get(`/chat/conversations/${conversationId}/messages`, {
          params: { perPage: 50 },
        });
        setMessages(res.data.messages);

        if (res.data.messages.length > 0) {
          const lastMsg = res.data.messages[res.data.messages.length - 1];
          lastTimestampRef.current = lastMsg.createdAt;
        }

        await api.patch(`/chat/conversations/${conversationId}/read`);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }

    // Fetch partner info
    async function loadPartner() {
      try {
        const res = await api.get("/chat/conversations", { params: { perPage: 50 } });
        const conv = res.data.conversations.find(
          (c: { id: number; user?: { id: number; name: string; profilePicture: string | null } }) =>
            c.id === conversationId,
        );
        if (conv?.user) {
          setPartner({
            id: conv.user.id,
            name: conv.user.name,
            profilePicture: conv.user.profilePicture,
          });
        }
      } catch {
        // ignore
      }
    }

    load();
    loadPartner();
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Polling
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!lastTimestampRef.current) return;
      try {
        const res = await api.get(`/chat/conversations/${conversationId}/poll`, {
          params: { since: lastTimestampRef.current },
        });
        const newMsgs: Message[] = res.data.messages;
        if (newMsgs.length > 0) {
          setMessages((prev) => {
            const existingIds = new Set(prev.map((m) => m.id));
            const unique = newMsgs.filter((m) => !existingIds.has(m.id));
            if (unique.length === 0) return prev;
            return [...prev, ...unique];
          });
          lastTimestampRef.current = newMsgs[newMsgs.length - 1].createdAt;
          await api.patch(`/chat/conversations/${conversationId}/read`);
        }
      } catch {
        // ignore
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [conversationId]);

  async function sendMessage(text: string) {
    if (!text.trim() || sending) return;
    setInput("");
    setErr(null);
    setSending(true);

    const optimisticMsg: Message = {
      id: Date.now(),
      senderType: "professional",
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      const res = await api.post(`/chat/conversations/${conversationId}/messages`, { content: text });
      setMessages((prev) => prev.map((m) => (m.id === optimisticMsg.id ? res.data : m)));
      lastTimestampRef.current = res.data.createdAt;
    } catch (error) {
      let msg = "Erro ao enviar mensagem.";
      if (isAxiosError(error)) msg = error.response?.data?.error || msg;
      setErr(msg);
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id));
      setInput(text);
    } finally {
      setSending(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    sendMessage(input.trim());
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e as unknown as FormEvent);
    }
  }

  const avatarUrl = partner?.profilePicture ?? null;

  return (
    <div className="flex flex-col h-[calc(100dvh-57px)] md:h-dvh -mb-6 overflow-hidden">
      {/* Header */}
      <header className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border/30">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 h-9 w-9"
          onClick={() => router.push("/pro/messages")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        {partner && (
          <div className="flex items-center gap-2">
            {avatarUrl ? (
              <img src={avatarUrl} alt={partner.name} className="h-9 w-9 rounded-full object-cover" />
            ) : (
              <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                {partner.name.charAt(0).toUpperCase()}
              </div>
            )}
            <p className="text-sm font-semibold">{partner.name}</p>
          </div>
        )}
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-w-0">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <p className="text-sm">Envie a primeira mensagem!</p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-end gap-2 ${msg.senderType === "professional" ? "flex-row-reverse" : "flex-row"}`}
          >
            <div
              className={`max-w-[80%] sm:max-w-[70%] px-4 py-3 rounded-2xl shadow-sm whitespace-pre-wrap text-sm leading-relaxed ${
                msg.senderType === "professional"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-card text-foreground rounded-bl-sm"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {err && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/15 px-3 py-2 text-sm text-destructive text-center">
            {err}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
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
            disabled={sending}
            className="flex-1 resize-none rounded-xl border border-border/30 bg-background/90 text-foreground placeholder:text-foreground/40 px-4 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50 max-h-40 overflow-y-auto"
            style={{ fieldSizing: "content" } as React.CSSProperties}
          />
          <Button
            type="submit"
            size="icon"
            disabled={sending || !input.trim()}
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
