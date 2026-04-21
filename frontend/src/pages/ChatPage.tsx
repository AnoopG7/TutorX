/**
 * ChatPage — Chat interface with message management
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { ChatInterface, type Message } from '@/components/chat/ChatInterface';
import { apiClient } from '@/lib/api';
import { nanoid } from 'nanoid';

interface StoredSession {
  id: string;
  subject: string;
  chapter: string;
  timestamp: number;
  messageCount: number;
  messages?: Message[];
}

export default function ChatPage() {
  const { user } = useAuth();
  const userId = user?.user_id;
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>(() => {
    // Get session from URL or create new one
    const params = new URLSearchParams(window.location.search);
    return params.get('session') || '';
  });

  // Load messages from backend when session ID changes
  useEffect(() => {
    if (sessionId && userId) {
      // TODO: Fetch from backend endpoint to get previous conversation
      // GET /api/sessions/{sessionId} or similar
      console.log('TODO: Fetch messages from backend for session:', sessionId);
    }
  }, [sessionId, userId]);

  const handleSendMessage = async (userMessage: string) => {
    if (!userId) return;

    // Add user message to UI
    const userMsg: Message = {
      id: nanoid(),
      role: 'user',
      content: userMessage,
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      // Send to backend
      const response = await apiClient.chat({
        user_id: userId,
        message: userMessage,
      });

      // Add assistant message
      const assistantMsg: Message = {
        id: nanoid(),
        role: 'assistant',
        content: response.response,
        citations: response.citations?.map((c) => ({
          chunk_id: c.chunk_id.toString(),
          source: `${c.chapter}${c.section ? ` - ${c.section}` : ''}`,
          score: 0, // Not provided by API
        })),
      };

      setMessages((prev) => {
        const updated = [...prev, assistantMsg];

        // TODO: Backend should persist this conversation to Supabase
        // API call needed: POST /api/sessions/{sessionId}/messages or similar
        // For now, only store session metadata in localStorage for UI display
        const currentSessionId = sessionId || nanoid();
        if (!sessionId) setSessionId(currentSessionId);

        const sessions: StoredSession[] = (() => {
          const stored = localStorage.getItem('chat_sessions');
          return stored ? JSON.parse(stored) : [];
        })();

        const sessionIndex = sessions.findIndex((s) => s.id === currentSessionId);
        const newSession: StoredSession = {
          id: currentSessionId,
          subject: 'General',
          chapter: `Chat - ${new Date().toLocaleDateString()}`,
          timestamp: Date.now(),
          messageCount: updated.length,
          // Don't store messages here - fetch from backend instead
        };

        if (sessionIndex >= 0) {
          sessions[sessionIndex] = newSession;
        } else {
          sessions.unshift(newSession);
        }

        localStorage.setItem('chat_sessions', JSON.stringify(sessions.slice(0, 10)));
        return updated;
      });
    } catch (error) {
      console.error('Failed to send message:', error);

      // Show error message
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
    <div className="flex flex-col h-full -mx-8 -my-6 bg-background">
      <ChatInterface
        messages={messages}
        onSendMessage={handleSendMessage}
        loading={loading}
        disabled={loading}
      />
    </div>
  );
}
