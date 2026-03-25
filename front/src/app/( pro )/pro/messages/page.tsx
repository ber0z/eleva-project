"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { MessageCircle } from "lucide-react";

type Conversation = {
  id: number;
  updatedAt: string;
  professionalLastReadAt: string | null;
  user: { id: number; name: string; profilePicture: string | null };
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

export default function ProMessagesPage() {
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
    <div className="flex flex-col h-full">
      <div className="px-4 sm:px-6 py-4 border-b border-border/30">
        <h1 className="text-lg font-semibold">Mensagens</h1>
      </div>

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
            <p className="text-xs text-center max-w-xs">
              Quando um cliente aceitar seu convite, você poderá conversar aqui.
            </p>
          </div>
        )}

        {conversations.map((conv) => {
          const lastMsg = conv.messages[0];
          const isUnread =
            lastMsg &&
            lastMsg.senderType === "user" &&
            (!conv.professionalLastReadAt || new Date(lastMsg.createdAt) > new Date(conv.professionalLastReadAt));

          const avatarUrl = conv.user.profilePicture ?? null;

          return (
            <button
              key={conv.id}
              onClick={() => router.push(`/pro/messages/${conv.id}`)}
              className="w-full flex items-center gap-3 px-4 sm:px-6 py-3 hover:bg-muted/50 transition border-b border-border/20 text-left"
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={conv.user.name}
                  className="h-11 w-11 rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="h-11 w-11 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-sm font-semibold">
                  {conv.user.name.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className={`text-sm truncate ${isUnread ? "font-bold" : "font-medium"}`}>
                    {conv.user.name}
                  </p>
                  {lastMsg && (
                    <span className="text-xs text-muted-foreground shrink-0 ml-2">
                      {timeAgo(lastMsg.createdAt)}
                    </span>
                  )}
                </div>
                {lastMsg && (
                  <p className={`text-xs truncate mt-0.5 ${isUnread ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                    {lastMsg.senderType === "professional" ? "Você: " : ""}
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
