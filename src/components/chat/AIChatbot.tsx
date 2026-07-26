import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, Send, Sparkles, MapPin, CalendarCheck, CreditCard, Users, Trophy, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
type Message = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

const SUGGESTIONS = [
  { icon: MapPin, label: "Find venues", message: "Help me find sports venues near me" },
  { icon: CalendarCheck, label: "How to book", message: "How do I book a venue on SportsBnB?" },
  { icon: CreditCard, label: "Pricing plans", message: "What subscription plans are available?" },
  { icon: Users, label: "Join a game", message: "How can I join a pickup game?" },
  { icon: Trophy, label: "Create a team", message: "How do I create and manage a team?" },
];

export const AIChatbot = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendText = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = { role: "user", content: text.trim() };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Please log in to chat with the assistant." },
        ]);
        setIsLoading(false);
        return;
      }

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ messages: allMessages }),
      });

      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({ error: "Something went wrong" }));
        setMessages((prev) => [...prev, { role: "assistant", content: err.error || "Sorry, something went wrong. Please try again." }]);
        setIsLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;

      const upsert = (chunk: string) => {
        assistantSoFar += chunk;
        const content = assistantSoFar;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant") {
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content } : m));
          }
          return [...prev, { role: "assistant", content }];
        });
      };

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, idx);
          textBuffer = textBuffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) upsert(content);
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, I couldn't connect. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, messages]);

  const sendMessage = useCallback(() => {
    sendText(input);
  }, [input, sendText]);

  const handleReset = () => {
    setMessages([]);
    setInput("");
  };

  // Floating button
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-[calc(5rem+var(--fab-lift,0px))] md:bottom-[calc(1.5rem+var(--fab-lift,0px))] right-4 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex items-center justify-center group"
        aria-label="Open AI assistant"
      >
        <Sparkles className="h-6 w-6 group-hover:rotate-12 transition-transform" />
        <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-chart-1 animate-pulse" />
      </button>
    );
  }

  return (
    <Card className="fixed bottom-[calc(5rem+var(--fab-lift,0px))] md:bottom-[calc(1.5rem+var(--fab-lift,0px))] right-4 z-50 w-[380px] h-[520px] flex flex-col shadow-2xl border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-primary text-primary-foreground">
        <div className="flex items-center gap-2.5">
          <Avatar className="h-8 w-8 border border-primary-foreground/20">
            <AvatarFallback className="bg-primary-foreground/15 text-primary-foreground text-xs">
              <Sparkles className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-sm leading-none">SportsBnB AI</p>
            <p className="text-[10px] opacity-75 mt-0.5">Always here to help</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/15" onClick={handleReset} title="New conversation" aria-label="New conversation">
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/15" onClick={() => setOpen(false)} aria-label="Close assistant">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col h-full">
            {/* Welcome */}
            <div className="text-center pt-4 pb-5">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 mb-3">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-sm text-foreground">Hi! I'm your SportsBnB assistant</h3>
              <p className="text-xs text-muted-foreground mt-1">Ask me anything about venues, bookings, or games</p>
            </div>

            {/* Suggestion chips */}
            <div className="space-y-2">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-1">Quick questions</p>
              <div className="grid gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => sendText(s.message)}
                    className="flex items-center gap-2.5 w-full text-left px-3 py-2.5 rounded-xl border bg-card hover:bg-accent hover:border-primary/30 transition-all duration-200 group"
                  >
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                      <s.icon className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm text-foreground">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => (
              <div key={i} className={cn("flex gap-2", msg.role === "user" ? "justify-end" : "justify-start")}>
                {msg.role === "assistant" && (
                  <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                    <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                      <Sparkles className="h-3.5 w-3.5" />
                    </AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={cn(
                    "max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-muted rounded-bl-md"
                  )}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:m-0 [&>ul]:m-0 [&>ol]:m-0 [&>p:not(:last-child)]:mb-2">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="break-words">{msg.content}</p>
                  )}
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role === "user" && (
              <div className="flex gap-2 justify-start">
                <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                  <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                    <Sparkles className="h-3.5 w-3.5" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-muted rounded-2xl rounded-bl-md px-3.5 py-2.5">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0ms]" />
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]" />
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t bg-card/50">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendMessage())}
            placeholder="Type your question..."
            className="flex-1 h-10 rounded-full border border-input bg-background px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-shadow"
            disabled={isLoading}
          />
          <Button onClick={sendMessage} disabled={!input.trim() || isLoading} size="icon" className="h-10 w-10 rounded-full flex-shrink-0 shadow-sm" aria-label="Send message">
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground text-center mt-2">Powered by AI · Responses may not always be accurate</p>
      </div>
    </Card>
  );
};
