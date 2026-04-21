/**
 * ChatInput — Message input with send button
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { chatMessageSchema, type ChatMessageData } from '@/lib/schemas';
import { Send, Loader } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  loading?: boolean;
  disabled?: boolean;
}

export function ChatInput({ onSend, loading, disabled }: ChatInputProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChatMessageData>({
    resolver: zodResolver(chatMessageSchema),
  });

  const onSubmit = (data: ChatMessageData) => {
    onSend(data.message);
    reset();
  };

  return (
    <div className="border-t border-border bg-background/95 p-4 shrink-0">
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-2 max-w-2xl mx-auto">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Ask a question about your studies..."
            disabled={disabled || loading}
            className="flex-1 h-10 rounded-md border border-border bg-background px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
            {...register('message')}
          />
          <Button
            type="submit"
            disabled={disabled || loading}
            size="icon"
            className="gap-2"
          >
            {loading ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        {errors.message && (
          <p className="text-xs font-medium text-red-500 px-1">{errors.message.message}</p>
        )}
      </form>
    </div>
  );
}
