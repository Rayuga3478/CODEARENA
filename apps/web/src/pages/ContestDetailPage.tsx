import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Calendar, CheckCircle2, Clock, ListOrdered, RefreshCw, Users } from 'lucide-react';
import { api } from '@/lib/api';
import type { ContestDetail, Paginated, StandingRow, SubmissionListItem } from '@/lib/types';
import { errorMessage, formatDateTime, formatDuration, timeAgo } from '@/lib/format';
import { useDocumentTitle } from '@/lib/hooks';
import { useAuthStore } from '@/stores/auth';
import { Container } from '@/components/Layout';
import { ContestStatusBadge } from '@/components/ContestCard';
import {
  Alert,
  Badge,
  Button,
  Countdown,
  DifficultyBadge,
  EmptyState,
  LinkButton,
  Loading,
  SkeletonRows,
  StatusCell,
  StatusIcon,
  Tabs,
  UserAvatar,
  UserLink,
  VerdictBadge,
  Window,
  toast,
} from '@/components/ui';

type TabId = 'problems' | 'standings' | 'submissions' | 'rules';

interface StandingsResponse {
  standings: StandingRow[];
  problems: string[];
  penaltyPerWrongAttempt: number;
}

export function ContestDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const [params, setParams] = useSearchParams();
  const qc = useQueryClient();
  const { user, isAuthenticated } = useAuthStore();

  const contestQ = useQuery({
    queryKey: ['contest', id, isAuthenticated],
    queryFn: () => api.get<{ contest: ContestDetail }>(`/contests/${id}`),
  });
  const contest = contestQ.data?.contest;
  useDocumentTitle(contest?.title ?? 'Contest');

  const live = contest?.status === 'RUNNING';
  const standingsQ = useQuery({
    queryKey: ['standings', id],
    enabled: !!contest && contest.status !== 'UPCOMING',
    queryFn: () => api.get<StandingsResponse>(`/contests/${id}/standings`),
    refetchInterval: live ? 20_000 : false,
  });

  const mySubsQ = useQuery({
    queryKey: ['submissions', 'contest', id, user?.id],
    enabled: !!contest && !!user && contest.status !== 'UPCOMING',
    queryFn: () => api.get<Paginated<SubmissionListItem>>(`/submissions?userId=${user!.id}&limit=100`),
    refetchInterval: live ? 20_000 : false,
  });

  const register = useMutation({
    mutationFn: () => api.post(`/contests/${id}/register`),
    onSuccess: () => {
      toast.ok('Registered', 'Good luck!');
      qc.invalidateQueries({ queryKey: ['contest', id] });
      qc.invalidateQueries({ queryKey: ['contests'] });
      qc.invalidateQueries({ queryKey: ['standings', id] });
    },
    onError: (err) => toast.bad('Registration failed', errorMessage(err)),
  });

  const refreshAll = () => {
    qc.invalidateQueries({ queryKey: ['contest', id] });
    qc.invalidateQueries({ queryKey: ['contests'] });
    qc.invalidateQueries({ queryKey: ['standings', id] });
  };

  if (contestQ.isLoading) return <Loading label="Loading contest…" />;
  if (contestQ.isError || !contest) {
    return (
      <Container>
        <Window title="Error" tone="bad" className="max-w-lg mx-auto">
          <Alert tone="bad">{errorMessage(contestQ.error, 'Contest not found')}</Alert>
          <div className="mt-4"><LinkButton to="/contests" leading={<ArrowLeft size={14} />}>All contests</LinkButton></div>
        </Window>
      </Container>
    );
  }

  const requested = params.get('tab') as TabId | null;
  const tab: TabId = requested ?? (contest.status === 'UPCOMING' ? 'rules' : 'problems');
  const setTab = (t: TabId) => setParams({ tab: t }, { replace: true });

  const myRow = standingsQ.data?.standings.find((r) => r.handle === user?.handle);
  const problemSlugs = new Set(contest.problems.map((p) => p.problem.slug));
  const start = +new Date(contest.startTime);
  const end = +new Date(contest.endTime);
  const mySubs = (mySubsQ.data?.data ?? []).filter((s) => {
    const t = +new Date(s.createdAt);
    return problemSlugs.has(s.problem.slug) && t >= start && t <= end;
  });
  const labelBySlug = new Map(contest.problems.map((p) => [p.problem.slug, p.label]));
  const canRegister = isAuthenticated && !contest.isRegistered && (contest.status === 'UPCOMING' || contest.status === 'RUNNING');

  return (
    <Container>
      <Link to="/contests" className="on-desk inline-flex items-center gap-1 text-[14px] mb-4 opacity-90">
        <ArrowLeft size={14} /> All contests
      </Link>

      {/* Header */}
      <Window
        title={`${contest.title}.exe`}
        tone={live ? 'gradient' : contest.status === 'ENDED' ? 'inactive' : 'default'}
        elevated
        className="mb-6 window-open"
      >
        <div className="grid gap-6 md:grid-cols-[1fr_auto] items-start p-1 sm:p-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <ContestStatusBadge status={contest.status} />
              {contest.isRegistered && <Badge tone="ok"><CheckCircle2 size={12} /> Registered</Badge>}
            </div>
            <h1 className="t-display text-[clamp(30px,5vw,52px)] m-0">{contest.title}</h1>
            {contest.description && <p className="t-secondary mt-3 mb-0 max-w-2xl">{contest.description}</p>}
            <dl className="flex flex-wrap gap-x-6 gap-y-2 mt-4 m-0 text-[14px]">
              <Meta icon={<Calendar size={14} />} value={formatDateTime(contest.startTime)} />
              <Meta icon={<Clock size={14} />} value={formatDuration(contest.duration)} />
              <Meta icon={<Users size={14} />} value={`${contest.participantCount} registered`} />
              {contest.problems.length > 0 && <Meta icon={<ListOrdered size={14} />} value={`${contest.problems.length} problems`} />}
            </dl>
          </div>
          <div className="flex flex-col gap-3 md:items-end">
            {contest.status !== 'ENDED' && (
              <div className="flex flex-col md:items-end gap-1">
                <span className="t-ui text-[13px] t-muted">{live ? 'Ends in' : 'Starts in'}</span>
                <Countdown target={live ? contest.endTime : contest.startTime} size="lg" onComplete={refreshAll} />
              </div>
            )}
            {myRow && (
              <div className="flex gap-4 text-[14px]">
                <span>Rank <strong className="t-mono">#{myRow.rank}</strong></span>
                <span>Solved <strong className="t-mono">{myRow.solved}</strong></span>
                <span>Penalty <strong className="t-mono">{myRow.penalty}</strong></span>
              </div>
            )}
            {canRegister && (
              <Button variant="primary" size="lg" onClick={() => register.mutate()} disabled={register.isPending}>
                {register.isPending ? 'Registering…' : 'Register'}
              </Button>
            )}
            {!isAuthenticated && contest.status !== 'ENDED' && (
              <LinkButton to={`/login?next=/contests/${id}`} variant="primary">Log in to register</LinkButton>
            )}
          </div>
        </div>
      </Window>

      <Tabs
        tabs={[
          { id: 'problems' as const, label: 'Problems', count: contest.problems.length || undefined },
          { id: 'standings' as const, label: 'Standings', count: standingsQ.data?.standings.length },
          ...(isAuthenticated ? [{ id: 'submissions' as const, label: 'My submissions', count: mySubsQ.data ? mySubs.length : undefined }] : []),
          { id: 'rules' as const, label: 'Rules' },
        ]}
        value={tab}
        onChange={setTab}
        panelClassName="p-3 sm:p-5"
      >
        {tab === 'problems' &&
          (contest.status === 'UPCOMING' ? (
            <EmptyState icon={<ListOrdered />} title="Problems unlock when the contest starts" description="Register now so you can submit as soon as it begins." />
          ) : contest.problems.length === 0 ? (
            <EmptyState title="No problems in this contest" />
          ) : (
            <div className="os-table-wrap">
              <table className="os-table">
                <thead>
                  <tr>
                    <th style={{ width: 44 }}><span className="os-th os-th--center">✓</span></th>
                    <th style={{ width: 56 }}><span className="os-th">#</span></th>
                    <th><span className="os-th">Problem</span></th>
                    <th style={{ width: 160 }}><span className="os-th">Difficulty</span></th>
                    <th style={{ width: 120 }}><span className="os-th os-th--right">Solved by</span></th>
                  </tr>
                </thead>
                <tbody>
                  {contest.problems.map((p) => {
                    const mine = myRow?.problems.find((c) => c.label === p.label);
                    const solvers = standingsQ.data?.standings.filter((r) => r.problems.find((c) => c.label === p.label)?.solved).length;
                    return (
                      <tr key={p.label} className={mine?.solved ? 'is-selected' : ''}>
                        <td className="center"><StatusIcon status={mine ? (mine.solved ? 'SOLVED' : mine.attempts > 0 ? 'ATTEMPTED' : 'NONE') : null} /></td>
                        <td className="t-mono font-bold">{p.label}</td>
                        <td>
                          <Link className="os-row-link" to={`/problems/${p.problem.slug}${live ? `?contest=${contest.id}` : ''}`}>{p.problem.title}</Link>
                        </td>
                        <td><DifficultyBadge rating={p.problem.difficulty} /></td>
                        <td className="num">{solvers ?? '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}

        {tab === 'standings' && (
          <StandingsTable q={standingsQ} meHandle={user?.handle} live={live} upcoming={contest.status === 'UPCOMING'} />
        )}

        {tab === 'submissions' &&
          (mySubsQ.isLoading ? (
            <SkeletonRows rows={4} cols={4} />
          ) : mySubs.length === 0 ? (
            <EmptyState title="No submissions in this contest yet" />
          ) : (
            <div className="os-table-wrap">
              <table className="os-table">
                <thead>
                  <tr>
                    <th><span className="os-th">When</span></th>
                    <th><span className="os-th">Problem</span></th>
                    <th><span className="os-th">Language</span></th>
                    <th><span className="os-th">Verdict</span></th>
                    <th><span className="os-th os-th--right">Time</span></th>
                  </tr>
                </thead>
                <tbody>
                  {mySubs.map((s) => (
                    <tr key={s.id}>
                      <td className="t-secondary whitespace-nowrap">{timeAgo(s.createdAt)}</td>
                      <td>
                        <span className="t-mono font-bold mr-2">{labelBySlug.get(s.problem.slug)}</span>
                        <Link to={`/problems/${s.problem.slug}${live ? `?contest=${contest.id}` : ''}`}>{s.problem.title}</Link>
                      </td>
                      <td>{s.language ?? s.languageId}</td>
                      <td><VerdictBadge verdict={s.verdict} /></td>
                      <td className="num">{s.executionTimeMs !== null ? `${s.executionTimeMs} ms` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

        {tab === 'rules' && (
          <div className="os-prose max-w-3xl" style={{ whiteSpace: 'normal' }}>
            <h2 className="os-section-title">Format</h2>
            <ul className="mt-0 pl-5">
              <li>ICPC-style scoring: every solved problem counts as one point.</li>
              <li>Ties are broken by total penalty time — fewer minutes ranks higher.</li>
              <li>Penalty for a solved problem = minutes from contest start to the accepted submission, plus <strong>20 minutes</strong> for each earlier rejected attempt.</li>
              <li>Compilation errors and internal errors are not penalised. Unsolved problems add no penalty.</li>
              <li>The first contestant to solve a problem gets a <span className="icpc-cell icpc-cell--first" style={{ minWidth: 0, display: 'inline' }}>first blood</span> marker.</li>
            </ul>
            <h2 className="os-section-title">Participation</h2>
            <ul className="mt-0 pl-5">
              <li>You must be registered to submit. Registration stays open while the contest is running.</li>
              <li>Problems become visible when the contest starts and remain available for practice afterwards.</li>
              <li>Supported languages: C++17 and Python 3.</li>
              <li>The live scoreboard refreshes automatically every 20 seconds.</li>
            </ul>
          </div>
        )}
      </Tabs>
    </Container>
  );
}

function Meta({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="t-muted">{icon}</span>
      <dd className="m-0">{value}</dd>
    </div>
  );
}

function StandingsTable({
  q,
  meHandle,
  live,
  upcoming,
}: {
  q: { data?: StandingsResponse; isLoading: boolean; isError: boolean; error: unknown; isFetching: boolean; refetch: () => void };
  meHandle?: string;
  live: boolean;
  upcoming: boolean;
}) {
  if (upcoming) return <EmptyState title="Standings appear once the contest starts" />;
  if (q.isLoading) return <SkeletonRows rows={6} cols={6} />;
  if (q.isError) return <Alert tone="bad">{errorMessage(q.error, "Couldn't load standings")}</Alert>;
  const data = q.data!;
  if (data.standings.length === 0) return <EmptyState icon={<Users />} title="No participants yet" />;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="t-ui text-[13px] t-muted">
          {live ? 'Live — auto-refresh every 20s' : 'Final standings'} · +{data.penaltyPerWrongAttempt} min per rejected attempt
        </span>
        <Button size="sm" onClick={() => q.refetch()} disabled={q.isFetching} leading={<RefreshCw size={13} className={q.isFetching ? 'animate-spin' : ''} />}>
          Refresh
        </Button>
      </div>
      <div className="os-table-wrap">
        <table className="os-table">
          <thead>
            <tr>
              <th style={{ width: 56 }}><span className="os-th">#</span></th>
              <th style={{ minWidth: 180 }}><span className="os-th">Contestant</span></th>
              <th style={{ width: 70 }}><span className="os-th os-th--center">=</span></th>
              <th style={{ width: 90 }}><span className="os-th os-th--right">Penalty</span></th>
              {data.problems.map((l) => (
                <th key={l} style={{ width: 70 }}><span className="os-th os-th--center">{l}</span></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.standings.map((r) => (
              <tr key={r.handle} className={r.handle === meHandle ? 'is-me' : ''}>
                <td className="t-mono font-bold">{r.rank}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <UserAvatar handle={r.handle} avatar={r.avatar} size={24} />
                    <UserLink handle={r.handle} rating={r.rating} />
                  </div>
                </td>
                <td className="center t-mono font-bold">{r.solved}</td>
                <td className="num">{r.penalty}</td>
                {r.problems.map((c) => (
                  <td key={c.label} className="center">
                    {c.solved ? (
                      <span className={`icpc-cell ${c.firstBlood ? 'icpc-cell--first' : 'icpc-cell--ok'}`} title={c.firstBlood ? 'First to solve' : 'Accepted'}>
                        +{c.attempts > 1 ? c.attempts - 1 : ''}
                        <small>{c.timeMin}′</small>
                      </span>
                    ) : c.attempts > 0 ? (
                      <span className="icpc-cell icpc-cell--bad" title={`${c.attempts} rejected`}>−{c.attempts}</span>
                    ) : (
                      <span className="t-muted">·</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="os-statusbar">
        <StatusCell>{data.standings.length} contestants</StatusCell>
        <StatusCell fit>
          <span className="icpc-cell icpc-cell--first" style={{ minWidth: 0, display: 'inline', padding: '0 4px' }}>+</span> first blood
        </StatusCell>
      </div>
    </div>
  );
}
