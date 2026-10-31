import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Award, CalendarDays, Flame, Medal, Star, Target, Trophy, Zap } from 'lucide-react';
import { api } from '@/lib/api';
import { errorMessage, formatDate, getTier, getVerdict, tierClass, tierVar, timeAgo } from '@/lib/format';
import { useDocumentTitle } from '@/lib/hooks';
import { useAuthStore } from '@/stores/auth';
import { Container } from '@/components/Layout';
import { ActivityHeatmap, RatingChart } from '@/components/Charts';
import { ContestStatusBadge } from '@/components/ContestCard';
import {
  Alert,
  Badge,
  EmptyState,
  GroupBox,
  LinkButton,
  Loading,
  StatusCell,
  UserAvatar,
  VerdictBadge,
  Window,
} from '@/components/ui';
import type { ContestStatus } from '@/lib/types';

interface Profile {
  id: string;
  handle: string;
  avatar: string | null;
  bio: string | null;
  country: string | null;
  rating: number;
  maxRating: number;
  role: string;
  createdAt: string;
  submissionCount: number;
  solvedCount: number;
  contestCount: number;
  globalRank: number;
  acceptedCount: number;
  currentStreak: number;
  maxStreak: number;
  activity: Record<string, number>;
  tagStats: { name: string; color: string; count: number }[];
  verdictStats: { verdict: string; count: number }[];
  languageStats: { language: string; count: number }[];
  recentContests: { id: string; title: string; startTime: string; status: ContestStatus }[];
  recentSubmissions: {
    id: string;
    verdict: string;
    executionTimeMs: number | null;
    languageId: string;
    language: string | null;
    createdAt: string;
    problem: { slug: string; title: string };
  }[];
  ratingHistory: { ratingBefore: number; ratingAfter: number; rank: number | null; createdAt: string; contest: { title: string } }[];
}

interface Achievement {
  icon: typeof Award;
  label: string;
  hint: string;
  earned: boolean;
}

/** Badges derived purely from real stats. */
function achievements(p: Profile): Achievement[] {
  return [
    { icon: Zap, label: 'First AC', hint: 'Solve your first problem', earned: p.solvedCount >= 1 },
    { icon: Target, label: 'Ten Down', hint: 'Solve 10 problems', earned: p.solvedCount >= 10 },
    { icon: Star, label: 'Half Century', hint: 'Solve 50 problems', earned: p.solvedCount >= 50 },
    { icon: Flame, label: 'On Fire', hint: 'Reach a 7-day streak', earned: p.maxStreak >= 7 },
    { icon: Trophy, label: 'Contender', hint: 'Join a contest', earned: p.contestCount >= 1 },
    { icon: Medal, label: 'Specialist+', hint: 'Reach 1400 rating', earned: p.maxRating >= 1400 },
    { icon: Award, label: 'Polyglot', hint: 'Submit in 2+ languages', earned: p.languageStats.length >= 2 },
  ];
}

export function ProfilePage() {
  const { handle = '' } = useParams<{ handle: string }>();
  const me = useAuthStore((s) => s.user);
  const q = useQuery({
    queryKey: ['profile', handle],
    queryFn: () => api.get<{ user: Profile }>(`/users/${handle}`),
  });
  useDocumentTitle(handle);

  if (q.isLoading) return <Loading label="Loading profile…" />;
  if (q.isError || !q.data) {
    return (
      <Container>
        <Window title="User not found" tone="bad" className="max-w-lg mx-auto">
          <Alert tone="bad">{errorMessage(q.error, `No user named “${handle}”.`)}</Alert>
          <div className="mt-4"><LinkButton to="/rankings">Browse rankings</LinkButton></div>
        </Window>
      </Container>
    );
  }

  const p = q.data.user;
  const tier = getTier(p.rating);
  const isMe = me?.handle === p.handle;
  const badges = achievements(p);
  const maxTag = Math.max(1, ...p.tagStats.map((t) => t.count));
  const totalVerdicts = p.verdictStats.reduce((a, v) => a + v.count, 0);
  const totalLang = p.languageStats.reduce((a, v) => a + v.count, 0);

  return (
    <Container>
      {/* System Properties header */}
      <Window title={`System Properties — ${p.handle}`} elevated className="mb-6 window-open">
        <div className="grid gap-6 md:grid-cols-[auto_1fr] items-center p-1 sm:p-3">
          <div className="flex md:flex-col items-center gap-4">
            <div className="p-1 bevel-in" style={{ background: 'var(--well)' }}>
              <UserAvatar handle={p.handle} avatar={p.avatar} size={112} />
            </div>
            {isMe && <Badge tone="info">This is you</Badge>}
          </div>
          <div className="min-w-0">
            <p className="t-ui m-0 text-[14px]" style={{ color: tierVar(p.rating) }}>{tier.title}</p>
            <h1 className={`t-display m-0 text-[clamp(36px,6vw,64px)] normal-case ${tierClass(p.rating)}`} style={{ textTransform: 'none' }}>
              {p.handle}
            </h1>
            <p className="t-secondary text-[14px] mt-2 mb-0 flex flex-wrap gap-x-4 gap-y-1">
              {p.country && <span>{p.country}</span>}
              <span className="inline-flex items-center gap-1"><CalendarDays size={13} /> Joined {formatDate(p.createdAt)}</span>
              {p.role === 'ADMIN' && <Badge tone="purple" flat>Admin</Badge>}
            </p>
            {p.bio && <p className="mt-3 mb-0 max-w-2xl">{p.bio}</p>}

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mt-5">
              <Stat label="Rating" value={p.rating} color={tierVar(p.rating)} />
              <Stat label="Max rating" value={p.maxRating} color={tierVar(p.maxRating)} />
              <Stat label="Global rank" value={`#${p.globalRank}`} />
              <Stat label="Solved" value={p.solvedCount} />
              <Stat label="Contests" value={p.contestCount} />
              <Stat label="Streak" value={`${p.currentStreak}d`} />
              <Stat label="Best streak" value={`${p.maxStreak}d`} />
            </div>
          </div>
        </div>
      </Window>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr] items-start">
        <div className="flex flex-col gap-6 min-w-0">
          <Window title="Activity" controls={false}>
            <ActivityHeatmap activity={p.activity} />
          </Window>

          <Window title="Rating history" controls={false}>
            {p.ratingHistory.length > 0 ? (
              <RatingChart history={p.ratingHistory} />
            ) : (
              <EmptyState icon={<Trophy />} title="No rated contests yet" description="The rating graph appears after the first rated contest." />
            )}
          </Window>

          <Window
            title="Recent submissions"
            controls={false}
            flush
            statusbar={<StatusCell>{p.submissionCount} total · {p.acceptedCount} accepted</StatusCell>}
          >
            {p.recentSubmissions.length === 0 ? (
              <EmptyState title="No submissions yet" />
            ) : (
              <div className="os-table-wrap">
                <table className="os-table">
                  <thead>
                    <tr>
                      <th><span className="os-th">Problem</span></th>
                      <th><span className="os-th">Verdict</span></th>
                      <th className="hidden sm:table-cell"><span className="os-th">Language</span></th>
                      <th><span className="os-th os-th--right">When</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.recentSubmissions.map((s) => (
                      <tr key={s.id}>
                        <td><Link className="os-row-link" to={`/problems/${s.problem.slug}`}>{s.problem.title}</Link></td>
                        <td><VerdictBadge verdict={s.verdict} /></td>
                        <td className="hidden sm:table-cell">{s.language ?? '—'}</td>
                        <td className="num t-secondary whitespace-nowrap">{timeAgo(s.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Window>
        </div>

        <div className="flex flex-col gap-6 min-w-0">
          <Window title="Badges" controls={false}>
            <ul className="list-none m-0 p-0 grid grid-cols-2 gap-2">
              {badges.map((b) => (
                <li
                  key={b.label}
                  className={`flex items-center gap-2 p-2 ${b.earned ? 'bevel-out' : 'bevel-in'}`}
                  style={{ background: b.earned ? 'var(--chrome)' : 'var(--well-alt)', opacity: b.earned ? 1 : 0.55 }}
                  title={b.earned ? `Earned: ${b.hint}` : `Locked: ${b.hint}`}
                >
                  <b.icon size={18} style={{ color: b.earned ? 'var(--title)' : 'var(--text-3)', flex: 'none' }} />
                  <span className="min-w-0">
                    <span className="t-ui text-[13px] block truncate">{b.label}</span>
                    <span className="text-[11px] t-muted block truncate">{b.hint}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Window>

          <Window title="Skills" controls={false}>
            {p.tagStats.length === 0 ? (
              <EmptyState title="No solved topics yet" />
            ) : (
              <ul className="list-none m-0 p-0 flex flex-col gap-2">
                {p.tagStats.slice(0, 10).map((t) => (
                  <li key={t.name} className="grid grid-cols-[110px_1fr_32px] items-center gap-2 text-[13px]">
                    <Link to={`/problems?tags=${encodeURIComponent(t.name)}`} className="truncate">{t.name}</Link>
                    <span className="h-3 bevel-thin-in" style={{ background: 'var(--well-alt)' }}>
                      <span className="block h-full" style={{ width: `${(t.count / maxTag) * 100}%`, background: t.color || 'var(--title)' }} />
                    </span>
                    <span className="t-mono text-right">{t.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </Window>

          <Window title="Breakdown" controls={false}>
            <div className="flex flex-col gap-4">
              <GroupBox legend="Verdicts">
                {totalVerdicts === 0 ? (
                  <p className="m-0 t-muted text-[13px]">No data</p>
                ) : (
                  <ul className="list-none m-0 p-0 flex flex-col gap-1.5">
                    {[...p.verdictStats].sort((a, b) => b.count - a.count).map((v) => (
                      <li key={v.verdict} className="flex items-center justify-between gap-2 text-[13px]">
                        <Badge tone={getVerdict(v.verdict).tone} flat>{getVerdict(v.verdict).label}</Badge>
                        <span className="t-mono">{v.count} <span className="t-muted">({Math.round((v.count / totalVerdicts) * 100)}%)</span></span>
                      </li>
                    ))}
                  </ul>
                )}
              </GroupBox>
              <GroupBox legend="Languages">
                {totalLang === 0 ? (
                  <p className="m-0 t-muted text-[13px]">No data</p>
                ) : (
                  <ul className="list-none m-0 p-0 flex flex-col gap-1.5">
                    {p.languageStats.map((l) => (
                      <li key={l.language} className="flex items-center justify-between text-[13px]">
                        <span>{l.language}</span>
                        <span className="t-mono">{l.count}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </GroupBox>
            </div>
          </Window>

          <Window title="Recent contests" controls={false}>
            {p.recentContests.length === 0 ? (
              <EmptyState title="No contests joined" action={<LinkButton to="/contests" size="sm">Find a contest</LinkButton>} />
            ) : (
              <ul className="list-none m-0 p-0 flex flex-col gap-2">
                {p.recentContests.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2">
                    <span className="min-w-0">
                      <Link to={`/contests/${c.id}`} className="block truncate font-semibold">{c.title}</Link>
                      <span className="text-[12px] t-muted">{formatDate(c.startTime)}</span>
                    </span>
                    <ContestStatusBadge status={c.status} />
                  </li>
                ))}
              </ul>
            )}
          </Window>
        </div>
      </div>
    </Container>
  );
}

function Stat({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div className="flex flex-col gap-1 p-2 bevel-in" style={{ background: 'var(--well)' }}>
      <span className="t-ui text-[11px] t-muted">{label}</span>
      <span className="t-mono font-bold text-[20px] leading-none" style={{ color }}>{value}</span>
    </div>
  );
}
