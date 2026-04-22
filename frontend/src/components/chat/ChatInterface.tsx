/**
 * ChatInterface — Full chat interface with message list and input
 * Input stays floating at bottom with padding, messages scroll above
 */

import { useEffect, useRef, useState } from "react";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { ArrowDown, Sparkles } from "lucide-react";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Array<{
    chunk_id: string;
    source: string;
    score: number;
  }>;
}

interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  loading?: boolean;
  disabled?: boolean;
}

export function ChatInterface({
  messages,
  onSendMessage,
  loading,
  disabled,
}: ChatInterfaceProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);

  // Auto-scroll to bottom on new messages, but only if user was at bottom
  useEffect(() => {
    if (messages.length === 0 || !containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    if (isAtBottom) {
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
    }
  }, [messages]);

  // Check scroll position to toggle button visibility
  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    setShowScrollButton(distanceFromBottom > 100);
  };

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Messages scrollable area - takes remaining space */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto pb-32"
      >
        <div className="max-w-2xl mx-auto flex flex-col gap-6 px-4 pt-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
              <div className="h-14 w-14 rounded-full bg-gradient-to-br from-violet-500 to-amber-500 mx-auto flex items-center justify-center mb-5">
                <Sparkles className="h-7 w-7 text-white" />
              </div>
              <p className="text-2xl font-bold text-foreground mb-2">
                What do you want to learn today?
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                Ask any question about Science, Math, Social Studies, or any CBSE topic
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  "Explain photosynthesis",
                  "What are polynomials?",
                  "Quiz me on Chapter 1",
                  "How does electricity work?",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => onSendMessage(suggestion)}
                    className="text-xs px-4 py-2 rounded-full border border-border bg-card hover:bg-muted/60 hover:border-primary/30 text-muted-foreground hover:text-foreground transition-all duration-150"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  role={msg.role}
                  content={msg.content}
                  citations={msg.citations}
                />
              ))}
              <div ref={bottomRef} className="h-4" />
            </>
          )}
        </div>
      </div>

      {/* Scroll to bottom button - fixed right side, above input */}
      <button
        onClick={scrollToBottom}
        className={`fixed right-6 bottom-24 bg-primary text-primary-foreground rounded-full p-2.5 shadow-lg hover:opacity-90 transition-all duration-200 z-50 ${
          messages.length > 2 ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        title="Scroll to bottom"
      >
        <ArrowDown className="h-4 w-4" />
      </button>

      {/* Floating input at bottom */}
      <div className="fixed bottom-4 left-0 right-0 px-4">
        <ChatInput onSend={onSendMessage} loading={loading} disabled={disabled} />
      </div>
    </div>
  );
}