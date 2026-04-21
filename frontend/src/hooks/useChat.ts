/**
 * useChat Hook — Chat state management and message sending
 */

import { useCallback, useState } from 'react';
import { apiClient, APIError } from '@/lib/api';
import { nanoid } from 'nanoid';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: string[];
  timestamp: Date;
  error?: boolean;
}

export function useChat(userId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const sendMessage = useCallback(
    async (text: string, subject?: string, chapter?: string) => {
      if (!userId || !text.trim()) {
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Add user message optimistically
        const userMessage: Message = {
          id: nanoid(),
          role: 'user',
          content: text.trim(),
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, userMessage]);

        // Send to backend
        const response = await apiClient.chat({
          user_id: userId,
          message: text.trim(),
          subject,
          chapter,
        });

        // Add assistant response
        const assistantMessage: Message = {
          id: nanoid(),
          role: 'assistant',
          content: response.response,
          citations: response.citations,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } catch (err) {
        let error: Error;
        let errorText = 'Sorry, I encountered an error. Please try again.';

        if (err instanceof APIError) {
          error = err;
          errorText = err.detail || 'Failed to connect to the server.';
        } else {
          error = err instanceof Error ? err : new Error('Unknown error');
          errorText = error.message;
        }

        setError(error);

        // Add error message instead of removing optimistic message
        const errorMessage: Message = {
          id: nanoid(),
          role: 'assistant',
          content: errorText,
          timestamp: new Date(),
          error: true,
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setLoading(false);
      }
    },
    [userId]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    loading,
    error,
    sendMessage,
    clearMessages,
  };
}
