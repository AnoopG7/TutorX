/**
 * ChatInterface — Full chat interface with message list and input
 */

import { useEffect, useRef } from 'react';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
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
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 0);
    }
  }, [messages]);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Messages Area - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 scroll-smooth">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center">
            <div>
              <p className="text-lg font-semibold text-foreground">Start a new conversation</p>
              <p className="text-sm text-muted-foreground mt-1">
                Ask any question about your studies and get instant help
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                role={msg.role}
                content={msg.content}
                citations={msg.citations}
              />
            ))}
            <div ref={scrollRef} className="h-0" />
          </div>
        )}
      </div>

      {/* Input Area - Always at bottom */}
      <ChatInput onSend={onSendMessage} loading={loading} disabled={disabled} />
    </div>
  );
}
