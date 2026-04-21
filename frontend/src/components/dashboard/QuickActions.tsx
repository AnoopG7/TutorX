/**
 * QuickActions — New chat, browse chapters, quiz buttons
 */

import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MessageCircle, Zap } from 'lucide-react';

export function QuickActions() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Link to="/chat">
        <Button variant="default" size="lg" className="w-full gap-2">
          <MessageCircle className="h-4 w-4" />
          New Chat
        </Button>
      </Link>

      <Link to="/progress">
        <Button variant="outline" size="lg" className="w-full gap-2">
          <Zap className="h-4 w-4" />
          View Progress
        </Button>
      </Link>
    </div>
  );
}
