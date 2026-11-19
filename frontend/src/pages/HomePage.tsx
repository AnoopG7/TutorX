import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookMarked, Moon, Sun } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useThemeContext } from '@/providers/ThemeProvider';
import { Logo } from '@/components/brand/Logo';
import { BackendStartupBanner } from '@/components/BackendStartupBanner';
import { SUBJECT_LIST } from '@/lib/constants';
import { cn } from '@/lib/utils';

const PIPELINE = [
  {
    title: 'Your question is matched against the book',
    body: 'Every page of the NCERT Class 9 books is split into passages and indexed. Your question is compared with all of them to find the closest ones.',
  },
  {
    title: 'Weak matches get a second search',
    body: 'If nothing fits well, the question is rephrased a few different ways and searched again, so casual wording still finds the right section.',
  },
  {
    title: 'The best passage is prepared for teaching',
    body: 'The top passage gets an everyday example, a common mistake to avoid, and a link to related ideas.',
  },
  {
    title: 'You get an answer in your style',
    body: 'The tutor writes the answer from those passages the way you like to learn, and shows the chapter and page it came from.',
  },
];

export default function HomePage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { resolvedTheme, toggleTheme } = useThemeContext();

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true });
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-dvh bg-background">
      <BackendStartupBanner />
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo to="/home" />
        <nav className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => toggleTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={resolvedTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <Link to="/login" className="rounded-md px-3 py-2 text-sm font-medium hover:bg-muted">
            Sign in
          </Link>
          <Link
            to="/signup"
            className="rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Create account
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-10 sm:px-6 lg:grid-cols-[1fr_1.05fr] lg:pt-16">
        <div>
          <h1 className="font-serif text-[2.6rem] font-semibold leading-[1.08] tracking-[-0.02em] sm:text-[3.6rem]">
            A tutor that answers from your NCERT textbook.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Ask any doubt from Class 9 Science, Maths, Social Science, English or Hindi. TutorX finds the passage in
            your book, explains it the way you learn best, and shows you the chapter and page it came from.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/signup"
              className="rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Start studying, it’s free
            </Link>
            <Link to="/login" className="rounded-md border border-border bg-card px-5 py-3 text-sm font-medium hover:bg-muted">
              I have an account
            </Link>
          </div>
        </div>

        <Specimen />
      </section>

      {/* How an answer is made: a real sequence, so numbered. */}
      <section className="border-y border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="max-w-xl font-serif text-3xl font-semibold tracking-tight">How an answer is made</h2>
          <p className="mt-3 max-w-xl text-muted-foreground">
            Retrieval-augmented generation, in four steps. The book comes first, and the AI explains it.
          </p>
          <ol className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {PIPELINE.map((step, i) => (
              <li key={step.title} className="relative">
                <span className="font-serif text-4xl font-semibold text-primary/25">{i + 1}</span>
                <h3 className="mt-2 font-medium leading-snug">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Subjects */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1fr_2fr]">
          <div>
            <h2 className="font-serif text-3xl font-semibold tracking-tight">Every Class 9 book</h2>
            <p className="mt-3 text-muted-foreground">
              Ask across all of them, or choose one subject so answers only come from that book.
            </p>
          </div>
          <ul className="divide-y divide-border border-y border-border">
            {SUBJECT_LIST.map((s) => (
              <li key={s.id} className="flex items-center gap-4 py-4">
                <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-md', s.tint)}>
                  <s.icon className={cn('h-[1.1rem] w-[1.1rem]', s.ink)} />
                </span>
                <span className="w-36 shrink-0 font-medium">{s.label}</span>
                <span className="min-w-0 truncate text-sm text-muted-foreground">{s.books === s.label ? 'One textbook' : s.books}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Closing */}
      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <div className="rounded-xl bg-primary px-6 py-12 text-primary-foreground sm:px-12 dark:border dark:border-border dark:bg-card dark:text-foreground">
          <h2 className="max-w-2xl font-serif text-3xl font-semibold leading-tight tracking-tight">
            Stuck on a chapter tonight? Ask it now.
          </h2>
          <p className="mt-3 max-w-xl opacity-85">
            Choose how you like to be taught: definitions, analogies, examples, or guiding questions.
          </p>
          <Link
            to="/signup"
            className="mt-7 inline-block rounded-md bg-primary-foreground px-5 py-3 text-sm font-medium text-primary hover:opacity-90 dark:bg-primary dark:text-primary-foreground"
          >
            Create a free account
          </Link>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:justify-between sm:px-6">
          <p>TutorX is a student project and is not affiliated with NCERT or CBSE.</p>
          <p>Built with React, FastAPI, pgvector and Groq.</p>
        </div>
      </footer>
    </div>
  );
}

/** A static example of what an answer looks like, with its margin source. */
function Specimen() {
  return (
    <figure
      aria-label="Example answer"
      className="relative rounded-xl border border-border bg-card p-5 shadow-[0_30px_60px_-30px_rgba(27,35,64,0.35)] sm:p-7"
    >
      <div className="flex justify-end">
        <p className="max-w-[85%] rounded-2xl rounded-br-md bg-accent px-4 py-2.5 text-[0.95rem] text-accent-foreground">
          Why is the cell called the basic unit of life?
        </p>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-[1fr_10.5rem]">
        <div className="reading text-[0.98rem]">
          <p>
            Every living thing, from a tiny amoeba to an elephant, is built from cells, and{' '}
            <span className="marker">each cell carries out all the basic functions of life</span> on its own: it takes
            in food, releases energy, gets rid of waste and makes new cells.
          </p>
          <p>
            Think of a cell like a single brick in a wall. The wall is made of bricks, and each brick is complete in
            itself.
          </p>
          <p className="text-muted-foreground">
            <em>Quick check:</em> can a single-celled organism live on its own?
          </p>
        </div>

        <figcaption className="border-t border-border pt-4 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
          <p className="mb-2.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <BookMarked className="h-3.5 w-3.5" />
            From your textbook
          </p>
          <div className="relative pl-3.5">
            <span aria-hidden className="absolute bottom-1 left-0 top-1 w-[3px] rounded-full bg-highlight" />
            <p className="text-[0.7rem] font-medium text-emerald-700 dark:text-[#A6CF97]">
              Science <span className="text-muted-foreground">/ Chapter 5</span>
            </p>
            <p className="mt-0.5 font-serif text-[0.9rem] leading-snug">The Fundamental Unit of Life</p>
            <p className="mt-0.5 text-xs text-muted-foreground">5.1 What are living organisms made up of?</p>
          </div>
        </figcaption>
      </div>
    </figure>
  );
}
