/**
 * ChatInput — Floating message input at bottom of chat
 */

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Send, Loader, Sparkles } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  loading?: boolean;
  disabled?: boolean;
}

export function ChatInput({ onSend, loading, disabled }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!disabled && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [disabled]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 150) + "px";
    }
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || loading || disabled) return;
    onSend(message.trim());
    setMessage("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="px-2 py-3">
      <form
        onSubmit={handleSubmit}
        className="max-w-2xl mx-auto flex gap-2 items-end"
      >
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your question..."
            disabled={disabled}
            rows={1}
            className="w-full min-h-[48px] max-h-[150px] rounded-2xl border border-border bg-card px-4 py-3 text-sm pr-10 placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors disabled:cursor-not-allowed disabled:opacity-50 resize-none"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/30">
            <Sparkles className="h-4 w-4" />
          </div>
        </div>
        <Button
          type="submit"
          disabled={disabled || loading || !message.trim()}
          size="lg"
          className="h-12 px-5 gap-2 rounded-2xl shrink-0"
        >
          {loading ? (
            <Loader className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
