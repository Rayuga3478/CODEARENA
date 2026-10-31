import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRight, Cpu, Gauge, ShieldCheck, Swords, Timer, Trophy, MessageSquare } from 'lucide-react';
import { api } from '@/lib/api';
import type { ContestListItem, LeaderboardRow, Paginated, PlatformStats, ProblemListItem } from '@/lib/types';
import { useDocumentTitle } from '@/lib/hooks';
import { formatDateTime, formatDuration, formatNumber, timeAgo } from '@/lib/format';
import { useAuthStore } from '@/stores/auth';
import { Container } from '@/components/Layout';
import { ProblemTable } from '@/components/ProblemTable';
import { ContestCard, ContestStatusBadge } from '@/components/ContestCard';
import {
  Countdown,
  EmptyState,
  IconContests,
  IconDiscuss,
  IconProblems,
  IconProfile,
  IconRankings,
  IconTerminal,
  LinkButton,
  Reveal,
  SkeletonRows,
  StatusCell,
  UserAvatar,
  UserLink,
  Window,
  RatingBadge,
} from '@/components/ui';

interface DiscussionItem {
  id: string;
  title: string;
  createdAt: string;
  author: { handle: string; rating: number };
  commentCount?: number;
}

export function HomePage() {
  useDocumentTitle('');
  const { user, isAuthenticated } = useAuthStore();
  const qc = useQueryClient();

  const stats = useQuery({ queryKey: ['platform-stats'], queryFn: () => api.get<PlatformStats>('/users/stats/platform') });
  const contests = useQuery({
    queryKey: ['contests', 'home'],
    queryFn: () => api.get<Paginated<ContestListItem>>('/contests?limit=12'),
  });
  const popular = useQuery({
    queryKey: ['problems', 'popular', isAuthenticated],
    queryFn: () => api.get<Paginated<ProblemListItem>>('/problems?sortBy=solvedCount&order=desc&limit=6'),
  });
  const leaders = useQuery({
    queryKey: ['leaderboard', 'home'],
    queryFn: () => api.get<Paginated<LeaderboardRow>>('/users?limit=5'),
  });
  const discussions = useQuery({
    queryKey: ['discussions', 'home'],
    queryFn: () => api.get<Paginated<DiscussionItem>>('/discussions?limit=4'),
  });

  const all = contests.data?.data ?? [];
  const live = all.filter((c) => c.status === 'RUNNING');
  const upcoming = all
    .filter((c) => c.status === 'UPCOMING')
    .sort((a, b) => +new Date(a.startTime) - +new Date(b.startTime));
  const featured = live[0] ?? upcoming[0] ?? null;
  const recent = all.filter((c) => c.id !== featured?.id).slice(0, 3);
  const refreshContests = () => qc.invalidateQueries({ queryKey: ['contests'] });

  const s = stats.data;
  const acRate = s && s.submissions > 0 ? Math.round((s.accepted / s.submissions) * 100) : null;

  return (
    <>
      {/* ── Hero: the desktop ─────────────────────────────────────────── */}
      <section className="relative">
        <Container className="grid gap-8 lg:grid-cols-[120px_1fr] items-start">
          {/* Desktop icons */}
          <nav aria-label="Desktop shortcuts" className="hidden lg:flex flex-col gap-3 pt-2">
            <DesktopIcon to="/problems" label="Problems" icon={<IconProblems />} />
            <DesktopIcon to="/contests" label="Contests" icon={<IconContests />} />
            <DesktopIcon to="/rankings" label="Rankings" icon={<IconRankings />} />
            <DesktopIcon to="/discuss" label="Discuss" icon={<IconDiscuss />} />
            <DesktopIcon to={user ? `/user/${user.handle}` : '/login'} label={user ? 'My Profile' : 'Log In'} icon={<IconProfile />} />
          </nav>

          <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr] items-start">
            <Window
              title="Welcome to CodeArena"
              icon={<IconTerminal width={16} height={16} />}
              elevated
              className="window-open"
              statusbar={
                <>
                  <StatusCell>{s ? `${formatNumber(s.problems)} problems online` : 'Connecting…'}</StatusCell>
                  <StatusCell fit>{s ? s.languages.map((l) => l.displayName).join(' · ') : '—'}</StatusCell>
                </>
              }
            >
              <div className="p-2 sm:p-4">
                <p className="t-eyebrow m-0 mb-3">Competitive programming, judged for real</p>
                <h1 className="t-display m-0 text-[clamp(44px,8vw,88px)]">
                  Solve. <span style={{ color: 'var(--title)' }}>Compete.</span>
                  <br />
                  Climb<span className="caret" aria-hidden="true" />
                </h1>
                <p className="t-secondary text-[16px] mt-5 mb-0 max-w-xl">
                  Practice on curated problems, test your code against the judge in seconds, and fight for rank in live ICPC-style contests.
                </p>
                <div className="flex flex-wrap gap-3 mt-7">
                  <LinkButton id="hero-start-solving" to="/problems" variant="primary" size="lg" trailing={<ArrowRight size={16} />}>
                    Start Solving
                  </LinkButton>
                  <LinkButton id="hero-explore-problems" to="/problems?sortBy=solvedCount&order=desc" size="lg">
                    Explore Problems
                  </LinkButton>
                </div>
                {!isAuthenticated && (
                  <p className="text-[13px] t-muted mt-4 mb-0">
                    New here? <Link to="/register">Create a free account</Link> to track progress and join contests.
                  </p>
                )}
              </div>
            </Window>

            {/* Featured contest */}
            <Window
              title={featured ? (featured.status === 'RUNNING' ? 'LIVE — Contest in progress' : 'Next contest') : 'Contests'}
              tone={featured?.status === 'RUNNING' ? 'gradient' : 'default'}
              icon={<Swords size={14} />}
              className="window-open"
              style={{ ['--open-delay' as string]: '90ms' }}
            >
              {contests.isLoading ? (
                <SkeletonRows rows={4} cols={2} />
              ) : featured ? (
                <div className="flex flex-col gap-4 p-1 sm:p-2">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="t-h3 text-[22px] leading-tight m-0">{featured.title}</h2>
                    <ContestStatusBadge status={featured.status} />
                  </div>
                  <div>
                    <p className="t-ui text-[13px] t-muted m-0 mb-1">{featured.status === 'RUNNING' ? 'Ends in' : 'Starts in'}</p>
                    <Countdown
                      target={featured.status === 'RUNNING' ? featured.endTime : featured.startTime}
                      size="lg"
                      onComplete={refreshContests}
                    />
                  </div>
                  <dl className="grid grid-cols-2 gap-3 m-0 text-[14px]">
                    <Fact label="Start" value={formatDateTime(featured.startTime)} />
                    <Fact label="Duration" value={formatDuration(featured.duration)} />
                    <Fact label="Problems" value={String(featured.problemCount)} />
                    <Fact label="Registered" value={String(featured.participantCount)} />
                  </dl>
                  <LinkButton to={`/contests/${featured.id}`} variant={featured.status === 'RUNNING' ? 'primary' : 'default'} block>
                    {featured.status === 'RUNNING' ? 'Enter contest' : 'View & register'}
                  </LinkButton>
                </div>
              ) : (
                <EmptyState
                  icon={<Trophy />}
                  title="No contest scheduled"
                  description="Past rounds and their standings are still available."
                  action={<LinkButton to="/contests" size="sm">Browse contests</LinkButton>}
                />
              )}
            </Window>
          </div>
        </Container>
      </section>

      {/* ── Live stats ────────────────────────────────────────────────── */}
      <section className="section-os pb-0" aria-label="Platform statistics">
        <Container>
          <Reveal>
            <Window title="System Monitor" controls={false}>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Stat label="Coders" value={s?.users} />
                <Stat label="Problems" value={s?.problems} />
                <Stat label="Submissions" value={s?.submissions} />
                <Stat label="Accepted" value={s?.accepted} />
                <Stat label="AC rate" value={acRate} suffix="%" className="col-span-2 md:col-span-1" />
              </div>
            </Window>
          </Reveal>
        </Container>
      </section>

      {/* ── Benefits ──────────────────────────────────────────────────── */}
      <section className="section-os">
        <Container>
          <SectionHeading eyebrow="Why CodeArena" title="Built for the grind" />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map((b, i) => (
              <Reveal key={b.title} delay={i * 70}>
                <Window title={b.file} interactive className="h-full" bodyClassName="flex flex-col gap-3 h-full">
                  <span className="grid place-items-center w-11 h-11 bevel-out" style={{ background: 'var(--chrome)' }}>
                    <b.icon size={22} style={{ color: 'var(--title)' }} />
                  </span>
                  <h3 className="t-h3 text-[18px] m-0">{b.title}</h3>
                  <p className="m-0 text-[14px] t-secondary">{b.body}</p>
                </Window>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* ── Popular problems + leaderboard ────────────────────────────── */}
      <section id="explore" className="pb-[var(--section-y)]">
        <Container className="grid gap-6 lg:grid-cols-[1.6fr_1fr] items-start">
          <Reveal>
            <Window
              title="C:\\PROBLEMS\\POPULAR"
              icon={<IconProblems width={16} height={16} />}
              flush
              statusbar={
                <>
                  <StatusCell>Most solved problems</StatusCell>
                  <StatusCell fit>
                    <Link to="/problems">Open Explorer →</Link>
                  </StatusCell>
                </>
              }
            >
              {popular.isLoading ? (
                <SkeletonRows rows={6} cols={4} />
              ) : popular.data?.data.length ? (
                <ProblemTable problems={popular.data.data} showStatus={isAuthenticated} />
              ) : (
                <EmptyState title="No problems yet" description="Problems appear here once they're published." />
              )}
            </Window>
          </Reveal>

          <Reveal delay={80}>
            <Window
              title="Hall of Fame"
              tone="gold"
              icon={<Trophy size={14} />}
              statusbar={
                <StatusCell>
                  <Link to="/rankings">Full rankings →</Link>
                </StatusCell>
              }
            >
              {leaders.isLoading ? (
                <SkeletonRows rows={5} cols={2} />
              ) : leaders.data?.data.length ? (
                <ol className="list-none m-0 p-0 flex flex-col">
                  {leaders.data.data.map((r) => (
                    <li key={r.handle} className="flex items-center gap-3 py-2.5 border-b last:border-b-0" style={{ borderColor: 'color-mix(in srgb, var(--lo) 35%, transparent)' }}>
                      <span className="t-mono font-bold w-6 text-center" style={{ color: r.rank <= 3 ? ['#d4a017', '#9aa0aa', '#c27a3a'][r.rank - 1] : 'var(--text-3)' }}>
                        {r.rank}
                      </span>
                      <UserAvatar handle={r.handle} avatar={r.avatar} size={30} />
                      <div className="flex-1 min-w-0">
                        <UserLink handle={r.handle} rating={r.rating} />
                        <div className="text-[12px] t-muted">{r.solvedCount} solved</div>
                      </div>
                      <RatingBadge rating={r.rating} />
                    </li>
                  ))}
                </ol>
              ) : (
                <EmptyState title="No ranked users yet" />
              )}
            </Window>
          </Reveal>
        </Container>
      </section>

      {/* ── Recent contests ───────────────────────────────────────────── */}
      {recent.length > 0 && (
        <section className="pb-[var(--section-y)]">
          <Container>
            <SectionHeading
              eyebrow="Compete"
              title="Contests"
              action={<LinkButton to="/contests" size="sm" trailing={<ArrowRight size={14} />}>All contests</LinkButton>}
            />
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {recent.map((c, i) => (
                <Reveal key={c.id} delay={i * 70} className="h-full">
                  <ContestCard contest={c} onStatusChange={refreshContests} />
                </Reveal>
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* ── Community ─────────────────────────────────────────────────── */}
      <section className="pb-[var(--section-y)]">
        <Container className="grid gap-6 lg:grid-cols-[1fr_1.3fr] items-center">
          <Reveal>
            <p className="t-eyebrow m-0 mb-3" style={{ color: 'var(--accent)' }}>Community</p>
            <h2 className="t-h2 on-desk">Stuck? Talk it through.</h2>
            <p className="on-desk opacity-85 mt-4 mb-6 max-w-md">
              Share approaches, ask about edge cases, and post editorials after the contest ends.
            </p>
            <LinkButton to="/discuss" leading={<MessageSquare size={16} />}>Open discussions</LinkButton>
          </Reveal>
          <Reveal delay={80}>
            <Window title="Recent threads" icon={<IconDiscuss width={16} height={16} />} well>
              {discussions.isLoading ? (
                <SkeletonRows rows={4} cols={2} />
              ) : discussions.data?.data.length ? (
                <ul className="list-none m-0 p-0">
                  {discussions.data.data.map((d) => (
                    <li key={d.id} className="px-3 py-3 border-b last:border-b-0" style={{ borderColor: 'color-mix(in srgb, var(--lo) 30%, transparent)' }}>
                      <Link to={`/discuss/${d.id}`} className="os-row-link font-semibold">{d.title}</Link>
                      <div className="text-[12px] t-muted mt-1 flex flex-wrap gap-x-2">
                        <UserLink handle={d.author.handle} rating={d.author.rating} />
                        <span>· {timeAgo(d.createdAt)}</span>
                        {d.commentCount !== undefined && <span>· {d.commentCount} replies</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState title="No threads yet" description="Be the first to start a discussion." />
              )}
            </Window>
          </Reveal>
        </Container>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────── */}
      <section className="pb-[var(--section-y)]">
        <Container>
          <Reveal>
            <Window title="Ready.exe" tone="gradient" elevated>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-2 sm:p-6">
                <div>
                  <h2 className="t-h2">Your next AC is one submit away.</h2>
                  <p className="t-secondary mt-3 mb-0">Pick a problem, write the code, press Ctrl+Enter.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <LinkButton to="/problems" variant="primary" size="lg">Start Solving</LinkButton>
                  {!isAuthenticated && <LinkButton to="/register" size="lg">Sign up</LinkButton>}
                </div>
              </div>
            </Window>
          </Reveal>
        </Container>
      </section>
    </>
  );
}

const BENEFITS = [
  { icon: Gauge, file: 'judge.sys', title: 'Fast verdicts', body: 'Submissions are queued and judged test-by-test, with per-test time and verdicts streamed back.' },
  { icon: Timer, file: 'contest.exe', title: 'Live contests', body: 'ICPC-style rounds with a live scoreboard, 20-minute penalties and first-blood markers.' },
  { icon: Cpu, file: 'run.bat', title: 'Run before submit', body: 'Test your code on samples or custom input before it ever touches your verdict history.' },
  { icon: ShieldCheck, file: 'rating.ini', title: 'Honest progress', body: 'Ratings, streaks, activity and skill breakdowns computed from your real submissions.' },
];

function DesktopIcon({ to, label, icon }: { to: string; label: string; icon: React.ReactNode }) {
  return (
    <Link to={to} className="os-icon">
      <span className="os-icon__img">{icon}</span>
      <span className="os-icon__label">{label}</span>
    </Link>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="t-ui text-[12px] t-muted">{label}</dt>
      <dd className="m-0 font-semibold truncate">{value}</dd>
    </div>
  );
}

function Stat({ label, value, suffix = '', className = '' }: { label: string; value: number | null | undefined; suffix?: string; className?: string }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <span className="os-lcd justify-center" style={{ fontSize: 26 }}>
        {value === undefined ? '----' : value === null ? '--' : `${formatNumber(value)}${suffix}`}
      </span>
      <span className="t-ui text-[13px] text-center t-secondary">{label}</span>
    </div>
  );
}

function SectionHeading({ eyebrow, title, action }: { eyebrow: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
      <div>
        <p className="t-eyebrow m-0 mb-2" style={{ color: 'var(--accent)' }}>{eyebrow}</p>
        <h2 className="t-h2 on-desk">{title}</h2>
      </div>
      {action}
    </div>
  );
}
