

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/providers/AuthProvider";
import { useProfile } from "@/hooks/useProfile";
import { RecentSessions } from "@/components/dashboard/RecentSessions";
import { apiClient, type Session } from "@/lib/api";
import {
  FlaskConical,
  Calculator,
  Globe,
  BookOpen,
  Sparkles,
  ArrowRight,
  MessageCirclePlus,
} from "lucide-react";

const SUBJECT_CARDS = [
  {
    label: "Science",
    icon: FlaskConical,
    color: "text-emerald-500",
    bg: "bg-emerald-500/10 hover:bg-emerald-500/15",
    border: "border-emerald-500/20",
  },
  {
    label: "Mathematics",
    icon: Calculator,
    color: "text-blue-500",
    bg: "bg-blue-500/10 hover:bg-blue-500/15",
    border: "border-blue-500/20",
  },
  {
    label: "Social Studies",
    icon: Globe,
    color: "text-amber-500",
    bg: "bg-amber-500/10 hover:bg-amber-500/15",
    border: "border-amber-500/20",
  },
  {
    label: "English",
    icon: BookOpen,
    color: "text-violet-500",
    bg: "bg-violet-500/10 hover:bg-violet-500/15",
    border: "border-violet-500/20",
  },
];

const SUGGESTION_CHIPS = [
  "Explain photosynthesis",
  "What is Ohm's law?",
  "Solve x² - 5x + 6 = 0",
  "Describe the water cycle",
  "Explain democracy",
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile(user?.user_id || "");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.user_id) return;

    const loadSessions = async () => {
      try {
        setLoading(true);
        const response = await apiClient.getSessions(user.user_id);
        setSessions(response.sessions);
      } catch (error) {
        console.error("Failed to load sessions:", error);
        setSessions([]);
      } finally {
        setLoading(false);
      }
    };

    loadSessions();
  }, [user?.user_id]);

  const handleOpenSession = (sessionId: string) => {
    navigate(`/chat?session=${sessionId}`);
  };

  const handleNewChat = (subject?: string) => {
    const params = subject ? `?subject=${encodeURIComponent(subject)}` : "";
    navigate(`/chat${params}`);
  };

  const handleSuggestion = (suggestion: string) => {
    navigate(`/chat?q=${encodeURIComponent(suggestion)}`);
  };

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  })();

  const firstName = profile?.name?.split(" ")[0] || user?.name?.split(" ")[0] || "Student";

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Hero Section */}
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-2">
            {greeting}, {firstName}
          </h1>
          <p className="text-muted-foreground text-lg">
            What would you like to study today?
          </p>
        </div>

        {/* New Chat Button */}
        <button
          onClick={() => handleNewChat()}
          className="w-full group flex items-center gap-3 p-4 rounded-2xl border border-border bg-card hover:bg-muted/50 hover:border-primary/30 transition-all duration-200 mb-6"
        >
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <MessageCirclePlus className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-medium text-foreground">Start a new conversation</p>
            <p className="text-xs text-muted-foreground">
              Ask about any CBSE topic — Science, Math, or Social Studies
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
        </button>

        {/* Subject Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {SUBJECT_CARDS.map(({ label, icon: Icon, color, bg, border }) => (
            <button
              key={label}
              onClick={() => handleNewChat(label)}
              className={`flex items-center gap-2 p-3 rounded-xl border ${border} ${bg} transition-all duration-150`}
            >
              <Icon className={`h-4 w-4 ${color}`} />
              <span className="text-sm font-medium text-foreground">{label}</span>
            </button>
          ))}
        </div>

        {/* Suggestion Chips */}
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Try asking
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {SUGGESTION_CHIPS.map((chip) => (
              <button
                key={chip}
                onClick={() => handleSuggestion(chip)}
                className="text-xs px-3 py-1.5 rounded-full border border-border bg-card hover:bg-muted/60 hover:border-primary/30 text-muted-foreground hover:text-foreground transition-all duration-150"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-6">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Recent conversations
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Sessions List */}
        <RecentSessions
          sessions={sessions}
          loading={loading}
          onOpenSession={handleOpenSession}
        />
      </div>
    </div>
  );
}
