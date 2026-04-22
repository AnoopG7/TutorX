/**
 * ChatPage — Chat interface with message management
 */

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { ChatInterface, type Message } from '@/components/chat/ChatInterface';
import { apiClient, type SessionMessage } from '@/lib/api';
import { nanoid } from 'nanoid';
import { ArrowLeft, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SUBJECT_COLORS: Record<string, { bg: string; text: string }> = {
  'Science': { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400' },
  'Mathematics': { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400' },
  'Social Studies': { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400' },
  'English': { bg: 'bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400' },
};

export default function ChatPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const userId = user?.user_id;
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const hasLoadedRef = useRef(false);
  const [sessionId, setSessionId] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('session') || '';
  });
  const [subject] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('subject') || '';
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
        subject: subject || undefined,
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

  const handleNewChat = () => {
    setMessages([]);
    setSessionId('');
    hasLoadedRef.current = false;
    window.history.replaceState({}, '', '/chat');
  };

  const subjectColor = subject && SUBJECT_COLORS[subject] ? SUBJECT_COLORS[subject] : null;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Chat Header */}
      <div className="border-b border-border bg-background/50 backdrop-blur supports-[backdrop-filter]:bg-background/40">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-border hover:bg-muted transition-colors"
              title="Back to dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="font-semibold text-foreground">Chat</h1>
              {subject && subjectColor && (
                <p className={`text-xs font-medium ${subjectColor.text}`}>
                  {subject}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleNewChat}
                className="text-xs"
              >
                New chat
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Chat Content */}
      <ChatInterface
        messages={messages}
        onSendMessage={handleSendMessage}
        loading={loading}
        disabled={loading}
      />
    </div>
  );
}