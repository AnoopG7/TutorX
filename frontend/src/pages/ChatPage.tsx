/**
 * ChatPage — Chat interface with message management
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { ChatInterface, type Message } from '@/components/chat/ChatInterface';
import { apiClient } from '@/lib/api';
import { nanoid } from 'nanoid';

export default function ChatPage() {
  const { user } = useAuth();
  const userId = user?.user_id;
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoadedHistory, setHasLoadedHistory] = useState(false);
  const [sessionId, setSessionId] = useState<string>(() => {
    // Get session from URL or create new one
    const params = new URLSearchParams(window.location.search);
    return params.get('session') || '';
  });

  // Load messages from backend when session ID changes (only once per session)
  useEffect(() => {
    if (sessionId && userId && !hasLoadedHistory) {
      loadSessionHistory();
      setHasLoadedHistory(true);
    }
  }, [sessionId, userId]);

  const loadSessionHistory = async () => {
    if (!sessionId || !userId) return;

    try {
      const response = await apiClient.getSessionHistory(userId, sessionId);

      // Convert API response format to Message format
      const formattedMessages: Message[] = response.messages.map((msg: any) => ({
        id: msg.id || nanoid(),
        role: msg.role,
        content: msg.content,
      }));

      setMessages(formattedMessages);
      console.log('✅ Loaded session history:', formattedMessages.length, 'messages');
    } catch (error) {
      console.error('Failed to load session history:', error);
      setMessages([]);
    }
  };

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
      // Send to backend - let backend create session if needed
      const response = await apiClient.chat({
        user_id: userId,
        message: userMessage,
        session_id: sessionId || undefined, // Pass sessionId if we have one
      });

      // If we got a new session_id from backend, store it
      if (response.session_id && !sessionId) {
        setSessionId(response.session_id);
        // Update URL to reflect the session
        window.history.replaceState({}, '', `/chat?session=${response.session_id}`);
      }

      // Add assistant message
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
    <div className="flex flex-col flex-1 w-full h-full overflow-hidden">
      <ChatInterface
        messages={messages}
        onSendMessage={handleSendMessage}
        loading={loading}
        disabled={false}
      />
    </div>
  );
}
