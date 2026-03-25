"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type Conversation = {
  id: number;
  updatedAt: string;
  userLastReadAt: string | null;
  professional: { id: number; name: string; profilePicture: string | null };
  messages: { content: string; createdAt: string; senderType: "user" | "professional" }[];
};

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d === 1) return "ontem";
  return `${d}d`;
}

export default function UserMessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  async function fetchConversations() {
    try {
      const res = await api.get("/chat/conversations", { params: { perPage: 50 } });
      setConversations(res.data.conversations);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-10 flex flex-col bg-background text-foreground">
      <header className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border/30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Button asChild variant="outline" size="sm" className="shrink-0 bg-card/90 hover:bg-accent border-border/30 shadow-sm">
          <Link href="/app/home">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>
        <p className="text-sm font-semibold">Mensagens</p>
      </header>

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}

        {!loading && conversations.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
            <MessageCircle className="h-12 w-12 opacity-30" />
            <p className="text-sm">Nenhuma conversa ainda</p>
          </div>
        )}

        {conversations.map((conv) => {
          const lastMsg = conv.messages[0];
          const isUnread =
            lastMsg &&
            lastMsg.senderType === "professional" &&
            (!conv.userLastReadAt || new Date(lastMsg.createdAt) > new Date(conv.userLastReadAt));

          const avatarUrl = conv.professional.profilePicture ?? null;

          return (
            <button
              key={conv.id}
              onClick={() => router.push(`/app/messages/${conv.id}`)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition border-b border-border/20 text-left"
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={conv.professional.name}
                  className="h-11 w-11 rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="h-11 w-11 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-sm font-semibold">
                  {conv.professional.name.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className={`text-sm truncate ${isUnread ? "font-bold" : "font-medium"}`}>
                    {conv.professional.name}
                  </p>
                  {lastMsg && (
                    <span className="text-xs text-muted-foreground shrink-0 ml-2">
                      {timeAgo(lastMsg.createdAt)}
                    </span>
                  )}
                </div>
                {lastMsg && (
                  <p className={`text-xs truncate mt-0.5 ${isUnread ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                    {lastMsg.senderType === "user" ? "Você: " : ""}
                    {lastMsg.content.slice(0, 60)}
                  </p>
                )}
              </div>

              {isUnread && (
                <span className="h-2.5 w-2.5 rounded-full bg-primary shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
