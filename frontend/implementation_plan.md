# Frontend Implementation Plan — TutorX

## Goal
Build a premium, modular React + shadcn/ui + Tailwind CSS frontend for the CBSE Study Agent. The design should feel like a polished EdTech product — clean, warm, and approachable — **not** a generic AI chatbot.

---

## Design Philosophy

### Color Theme: "Warm Study"
A warm violet/indigo primary with soft amber accents. Feels educational, not corporate.

| Token | Light Mode | Dark Mode | Usage |
|-------|-----------|-----------|-------|
| Primary | `hsl(262, 83%, 58%)` — violet-500 | `hsl(262, 83%, 68%)` | Buttons, active states, links |
| Accent | `hsl(38, 92%, 50%)` — amber-500 | `hsl(38, 92%, 60%)` | Highlights, badges, scores |
| Background | `hsl(0, 0%, 100%)` white | `hsl(240, 10%, 6%)` near-black | Page bg |
| Card | `hsl(0, 0%, 99%)` | `hsl(240, 6%, 10%)` | Card surfaces |
| Muted | `hsl(240, 5%, 96%)` | `hsl(240, 4%, 16%)` | Secondary surfaces |
| Border | `hsl(240, 6%, 90%)` | `hsl(240, 4%, 20%)` | Subtle borders |
| Text | `hsl(240, 10%, 4%)` | `hsl(0, 0%, 95%)` | Primary text |

### Typography
- **Font**: Inter (Google Fonts) — clean, modern, excellent for reading
- No novelty fonts — readability first for students

### Anti-"AI-look" Rules
- ❌ No glowing gradients, no pulsing orbs, no robot avatars
- ❌ No "Powered by AI™" badges everywhere
- ✅ Clean cards, clear hierarchy, generous whitespace
- ✅ Subject-colored accents (🟢 Science, 🔵 Math, 🟠 Social Studies)
- ✅ Feels like **Notion** × **Duolingo** — structured but friendly

---

## Pages & Routes

| Route | Page | Description |
|-------|------|-------------|
| `/` | Dashboard | Welcome, recent sessions, quick actions, subject cards |
| `/chat` | Study Chat | Main tutor chat interface with markdown rendering |
| `/chat/:sessionId` | Session Chat | Resume a specific session |
| `/chapters` | Chapters | Browse chapters by subject and grade |
| `/progress` | Progress | Weak areas, mastered topics, quiz scores |
| `/settings` | Settings | Profile, teaching style, theme toggle |

---

## Component Architecture

```
src/
├── components/
│   ├── ui/                    # shadcn components (auto-generated)
│   ├── layout/
│   │   ├── Navbar.tsx         # Top navbar with logo, nav links, theme toggle
│   │   ├── PageShell.tsx      # Wrapper: navbar + main content area
│   │   └── MobileNav.tsx      # Sheet-based mobile navigation
│   ├── chat/
│   │   ├── ChatInterface.tsx  # Full chat: message list + input
│   │   ├── MessageBubble.tsx  # Single message (user or tutor)
│   │   ├── ChatInput.tsx      # Input with send button + subject selector
│   │   └── CitationTag.tsx    # Inline citation badge
│   ├── dashboard/
│   │   ├── WelcomeCard.tsx    # Greeting + quick summary
│   │   ├── SubjectCard.tsx    # Subject tile with chapter count
│   │   ├── RecentSessions.tsx # Session history list
│   │   └── QuickActions.tsx   # New chat, browse chapters, quiz
│   └── progress/
│       ├── StatsOverview.tsx   # Total sessions, mastered, weak
│       ├── WeakAreasList.tsx   # Weak topics with scores
│       └── TopicBadge.tsx     # Mastered/weak topic chip
├── pages/
│   ├── DashboardPage.tsx
│   ├── ChatPage.tsx
│   ├── ChaptersPage.tsx
│   ├── ProgressPage.tsx
│   └── SettingsPage.tsx
├── lib/
│   ├── api.ts                 # API client (fetch wrapper for /api/*)
│   ├── utils.ts               # shadcn cn() utility
│   └── constants.ts           # Subject colors, teaching styles
├── hooks/
│   ├── useChat.ts             # Chat state + API integration
│   ├── useProfile.ts          # Student profile read/write
│   └── useTheme.ts            # Dark/light mode toggle
├── providers/
│   ├── ThemeProvider.tsx       # Dark mode context
│   └── UserProvider.tsx       # User ID + profile context
├── App.tsx                    # Router setup
├── main.tsx                   # Entry point
└── index.css                  # Tailwind + shadcn theme tokens
```

---

## Proposed Changes

### Phase A: Foundation (Tooling)
Set up Tailwind CSS, shadcn/ui, React Router, and theme infrastructure.

#### [MODIFY] tsconfig.json + tsconfig.app.json
- Add `baseUrl` and `@/*` path alias per shadcn docs

#### [MODIFY] vite.config.ts
- Add `@tailwindcss/vite` plugin and `@` alias resolution

#### [MODIFY] index.css
- Tailwind import + full shadcn CSS variables for light/dark themes

#### [MODIFY] package.json
- Add: `tailwindcss`, `@tailwindcss/vite`, `react-router-dom`, `lucide-react`, `react-markdown`

#### [NEW] components.json
- shadcn configuration file

---

### Phase B: Shared Infrastructure
Theme, providers, API client, utilities.

#### [NEW] lib/utils.ts — `cn()` utility
#### [NEW] lib/api.ts — API client for backend
#### [NEW] lib/constants.ts — Subject colors, styles
#### [NEW] hooks/useTheme.ts — Dark/light mode hook
#### [NEW] hooks/useChat.ts — Chat state management
#### [NEW] hooks/useProfile.ts — Profile loading
#### [NEW] providers/ThemeProvider.tsx — System/light/dark toggle
#### [NEW] providers/UserProvider.tsx — User ID persistence

---

### Phase C: Layout & Navigation

#### [NEW] components/layout/Navbar.tsx
- Logo (text: "TutorX") + navigation links
- Theme toggle (sun/moon icon)
- Mobile hamburger → Sheet drawer

#### [NEW] components/layout/PageShell.tsx
- Wraps navbar + `<Outlet />` for React Router

---

### Phase D: Pages

#### [NEW] pages/DashboardPage.tsx
- Welcome card with student name
- Subject cards (Science, Math, Social Studies)
- Recent sessions list
- Quick action buttons (New Chat, Browse Chapters)

#### [NEW] pages/ChatPage.tsx
- Full chat interface with message list
- Markdown rendering for tutor responses
- Citation tags inline
- Subject/chapter selector in input area

#### [NEW] pages/ChaptersPage.tsx
- Browse chapters by subject + grade
- Chapter cards with content preview

#### [NEW] pages/ProgressPage.tsx
- Stats overview cards (sessions, mastered, weak)
- Weak areas list with improvement suggestions
- Mastered topics as badges

#### [NEW] pages/SettingsPage.tsx
- Profile form (name, grade, subjects)
- Teaching style selector (4 options)
- Theme toggle (system/light/dark)

---

## Implementation Order

1. **Tooling** — Install deps, configure Tailwind + shadcn + aliases
2. **Theme + Providers** — CSS variables, ThemeProvider, UserProvider
3. **Layout** — Navbar, PageShell, router setup
4. **Dashboard** — Landing page with subject cards + recent sessions
5. **Chat** — Core chat interface with API integration
6. **Chapters + Progress + Settings** — Secondary pages

---

## User Review Required

> [!IMPORTANT]
> **shadcn/ui CLI**: I'll use `npx shadcn@latest init` on the existing Vite project and then `npx shadcn@latest add <component>` for each component. This adds the source files directly to `src/components/ui/`.

> [!IMPORTANT]
> **Dev-mode auth**: Frontend will use `user_id` in request body (no JWT), matching the backend's existing dev-mode flow. Can switch to Supabase Auth later.

> [!NOTE]
> I'll start with **steps 1-4** (tooling through dashboard) in this session, then continue with chat and secondary pages.

---

## Verification Plan

### Visual
- Run `npm run dev`, open browser, verify:
  - Dark/light mode toggle works
  - Navbar renders on all pages
  - Dashboard shows subject cards
  - Chat interface sends messages and renders responses

### Functional
- `POST /api/chat` actually works from chat page
- Profile loads from backend on dashboard
- Session history renders on chat page
