import { useState, useEffect, useRef } from "react";
import { Send, MessageSquare, ArrowLeft, RefreshCw } from "lucide-react";
import { useUser } from "@clerk/react";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format, isToday, isYesterday } from "date-fns";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

interface Conversation {
  partnerId: string;
  partnerName: string;
  partnerAvatar: string | null;
  lastMessage: string;
  lastAt: string | null;
  unreadCount: number;
}

interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

async function apiFetch(url: string, opts?: RequestInit) {
  return fetch(url, { ...opts, credentials: "include" });
}

function formatMessageTime(dateStr: string) {
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, "h:mm a");
  if (isYesterday(d)) return `Yesterday ${format(d, "h:mm a")}`;
  return format(d, "MMM d, h:mm a");
}

function ConversationItem({
  conv,
  active,
  onClick,
}: {
  conv: Conversation;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full p-3.5 flex items-center gap-3 hover:bg-accent transition-colors text-left border-b border-border/40 ${
        active ? "bg-accent border-l-2 border-l-violet-500" : ""
      }`}
    >
      <div className="relative shrink-0">
        <Avatar className="h-10 w-10">
          <AvatarImage src={conv.partnerAvatar ?? undefined} />
          <AvatarFallback className="bg-violet-600 text-white text-sm font-bold">
            {conv.partnerName?.[0]?.toUpperCase() ?? "?"}
          </AvatarFallback>
        </Avatar>
        {conv.unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-violet-500 text-white text-[9px] rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 font-bold border border-background">
            {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline gap-1">
          <span className={`text-sm font-semibold truncate ${active ? "text-violet-600 dark:text-violet-300" : "text-foreground"}`}>
            {conv.partnerName}
          </span>
          {conv.lastAt && (
            <span className="text-[10px] text-muted-foreground/60 shrink-0">
              {formatMessageTime(conv.lastAt)}
            </span>
          )}
        </div>
        <p className={`text-xs truncate mt-0.5 ${conv.unreadCount > 0 ? "text-foreground/70 font-medium" : "text-muted-foreground"}`}>
          {conv.lastMessage || "No messages yet"}
        </p>
      </div>
    </button>
  );
}

export default function Inbox() {
  const { user: clerkUser } = useUser();
  const { toast } = useToast();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [dbUserId, setDbUserId] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!clerkUser) return;
    apiFetch(`${BASE}/api/users/me`)
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setDbUserId(d.id))
      .catch(() => {});
  }, [clerkUser]);

  function loadConversations() {
    setLoadingConvs(true);
    apiFetch(`${BASE}/api/messages/conversations`)
      .then(r => r.ok ? r.json() : [])
      .then(setConversations)
      .catch(() => setConversations([]))
      .finally(() => setLoadingConvs(false));
  }

  useEffect(() => { loadConversations(); }, []);

  useEffect(() => {
    if (!activeConv) return;
    setLoadingMsgs(true);
    setMessages([]);
    apiFetch(`${BASE}/api/messages/${activeConv.partnerId}`)
      .then(r => r.ok ? r.json() : [])
      .then(msgs => {
        setMessages(msgs);
        setConversations(prev =>
          prev.map(c => c.partnerId === activeConv.partnerId ? { ...c, unreadCount: 0 } : c),
        );
      })
      .catch(() => {})
      .finally(() => setLoadingMsgs(false));
  }, [activeConv?.partnerId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (activeConv) setTimeout(() => inputRef.current?.focus(), 100);
  }, [activeConv]);

  useEffect(() => {
    const id = setInterval(() => {
      apiFetch(`${BASE}/api/messages/conversations`)
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) setConversations(data); })
        .catch(() => {});
    }, 10000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!activeConv) return;
    const id = setInterval(() => {
      apiFetch(`${BASE}/api/messages/${activeConv.partnerId}`)
        .then(r => r.ok ? r.json() : null)
        .then(msgs => {
          if (!msgs) return;
          setMessages(prev => {
            if (msgs.length !== prev.filter(m => !m.id.startsWith("temp-")).length) return msgs;
            return prev;
          });
        })
        .catch(() => {});
    }, 5000);
    return () => clearInterval(id);
  }, [activeConv?.partnerId]);

  async function sendMessage() {
    if (!body.trim() || !activeConv || sending) return;
    const text = body.trim();
    setBody("");
    setSending(true);

    const tempMsg: Message = {
      id: `temp-${Date.now()}`,
      senderId: dbUserId ?? "me",
      receiverId: activeConv.partnerId,
      body: text,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      const r = await apiFetch(`${BASE}/api/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: activeConv.partnerId, body: text }),
      });
      if (r.ok) {
        const msg = await r.json();
        setMessages(prev => prev.map(m => m.id === tempMsg.id ? msg : m));
        setConversations(prev =>
          prev.map(c => c.partnerId === activeConv.partnerId
            ? { ...c, lastMessage: text, lastAt: msg.createdAt }
            : c,
          ),
        );
      } else {
        setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
        toast({ title: "Error", description: "Could not send message.", variant: "destructive" });
      }
    } catch {
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
      toast({ title: "Error", description: "Network error. Check your connection.", variant: "destructive" });
    } finally {
      setSending(false);
    }
  }

  const myId = dbUserId;

  return (
    <div className="h-[calc(100vh-8rem)] flex rounded-2xl overflow-hidden border border-border bg-card">

      {/* ── Sidebar ── */}
      <div className={`w-full md:w-72 flex-shrink-0 border-r border-border flex flex-col ${activeConv ? "hidden md:flex" : "flex"}`}>
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-violet-500" />
            <h2 className="text-foreground font-bold text-sm">Messages</h2>
          </div>
          <button
            onClick={loadConversations}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-accent"
            title="Refresh"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingConvs ? "animate-spin" : ""}`} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
            <div className="p-4 space-y-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex items-center gap-3 p-2 animate-pulse">
                  <div className="h-10 w-10 rounded-full bg-muted shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-2/3 bg-muted rounded" />
                    <div className="h-2.5 w-1/2 bg-muted rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center space-y-3">
              <MessageSquare className="h-10 w-10 text-muted-foreground/40 mx-auto" />
              <div>
                <p className="text-foreground/70 text-sm font-medium">No conversations yet</p>
                <p className="text-muted-foreground text-xs mt-1">Visit a creator's profile to start chatting.</p>
              </div>
            </div>
          ) : (
            conversations.map(conv => (
              <ConversationItem
                key={conv.partnerId}
                conv={conv}
                active={activeConv?.partnerId === conv.partnerId}
                onClick={() => setActiveConv(conv)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Chat panel ── */}
      {activeConv ? (
        <div className="flex-1 flex flex-col min-w-0">
          <div className="px-4 py-3 border-b border-border flex items-center gap-3 bg-muted/30">
            <button
              onClick={() => setActiveConv(null)}
              className="md:hidden text-muted-foreground hover:text-foreground transition-colors p-1"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <Avatar className="h-8 w-8 border border-border">
              <AvatarImage src={activeConv.partnerAvatar ?? undefined} />
              <AvatarFallback className="bg-violet-600 text-white text-xs font-bold">
                {activeConv.partnerName?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-foreground font-semibold text-sm leading-tight">{activeConv.partnerName}</p>
              <p className="text-muted-foreground text-[11px]">Direct message</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {loadingMsgs ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-muted-foreground text-sm flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" /> Loading messages…
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                <MessageSquare className="h-10 w-10 text-muted-foreground/30" />
                <div>
                  <p className="text-foreground/70 text-sm font-medium">No messages yet</p>
                  <p className="text-muted-foreground text-xs">Say hello to {activeConv.partnerName}!</p>
                </div>
              </div>
            ) : (
              messages.map((msg, i) => {
                const isMine = myId ? msg.senderId === myId : msg.senderId !== activeConv.partnerId;
                const isTemp = msg.id.startsWith("temp-");
                const prevMsg = messages[i - 1];
                const showTime = !prevMsg || (
                  new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() > 5 * 60 * 1000
                );

                return (
                  <div key={msg.id}>
                    {showTime && (
                      <div className="flex justify-center my-3">
                        <span className="text-[10px] text-muted-foreground bg-muted px-3 py-1 rounded-full border border-border">
                          {formatMessageTime(msg.createdAt)}
                        </span>
                      </div>
                    )}
                    <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                      {!isMine && (
                        <Avatar className="h-6 w-6 mr-2 self-end mb-1 shrink-0">
                          <AvatarImage src={activeConv.partnerAvatar ?? undefined} />
                          <AvatarFallback className="bg-violet-600 text-white text-[10px]">
                            {activeConv.partnerName?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={`max-w-[72%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                          isMine
                            ? `bg-violet-600 text-white rounded-br-sm ${isTemp ? "opacity-70" : ""}`
                            : "bg-muted text-foreground rounded-bl-sm border border-border"
                        }`}
                      >
                        <p className="break-words">{msg.body}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          <div className="p-3 border-t border-border bg-muted/20">
            <div className="flex gap-2 items-end">
              <input
                ref={inputRef}
                type="text"
                value={body}
                onChange={e => setBody(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
                }}
                placeholder={`Message ${activeConv.partnerName}…`}
                className="flex-1 px-4 py-2.5 bg-background border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-violet-500/70 text-sm transition-colors"
              />
              <button
                onClick={sendMessage}
                disabled={!body.trim() || sending}
                className="shrink-0 p-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center">
          <div className="text-center space-y-3">
            <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mx-auto border border-border">
              <MessageSquare className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <div>
              <h3 className="text-foreground font-semibold">Select a conversation</h3>
              <p className="text-muted-foreground text-sm mt-1">Choose someone from the sidebar to start chatting.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
