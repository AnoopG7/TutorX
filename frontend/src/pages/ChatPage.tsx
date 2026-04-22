/**
 * ChatPage — Chat interface with message management
 */

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { ChatInterface, type Message } from '@/components/chat/ChatInterface';
import { apiClient, type SessionMessage } from '@/lib/api';
import { nanoid } from 'nanoid';

export default function ChatPage() {
  const { user } = useAuth();
  const userId = user?.user_id;
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const hasLoadedRef = useRef(false);
  const [sessionId, setSessionId] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('session') || '';
  });

  useEffect(() => {
    if (!sessionId || !userId || hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    const loadSessionHistory = async () => {
      try {
        const response = await apiClient.getSessionHistory(userId, sessionId);
        const formatted: Message[] = response.messages.map((msg: SessionMessage) => ({
          id: (msg.id as string) || nanoid(),
          role: msg.role as 'user' | 'assistant',
          content: msg.content as string,
        }));
        setMessages(formatted);
      } catch {
        setMessages([]);
      }
    };

    loadSessionHistory();
  }, [sessionId, userId]);

  const handleSendMessage = async (userMessage: string) => {
    if (!userId) return;

    const userMsg: Message = {
      id: nanoid(),
      role: 'user',
      content: userMessage,
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const response = await apiClient.chat({
        user_id: userId,
        message: userMessage,
        session_id: sessionId || undefined,
      });

      if (response.session_id && !sessionId) {
        setSessionId(response.session_id);
        window.history.replaceState({}, '', `/chat?session=${response.session_id}`);
      }

      const assistantMsg: Message = {
        id: nanoid(),
        role: 'assistant',
        content: response.response,
        citations: response.citations?.map((c, idx) => ({
          chunk_id: (idx + 1).toString(),
          source: c,
          score: 0,
        })),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const errorMsg: Message = {
        id: nanoid(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <ChatInterface
        messages={messages}
        onSendMessage={handleSendMessage}
        loading={loading}
        disabled={loading}
      />
    </div>
  );
}