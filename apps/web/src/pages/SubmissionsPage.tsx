import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Clock, HardDrive, ListChecks } from 'lucide-react';
import { api } from '@/lib/api';
import type { Paginated, SubmissionDetail, SubmissionListItem } from '@/lib/types';
import { formatDateTime, formatMemory, getVerdict, isPendingVerdict, timeAgo } from '@/lib/format';
import { useDebounced, useDocumentTitle } from '@/lib/hooks';
import { useAuthStore } from '@/stores/auth';
import { Container, PageHeader } from '@/components/Layout';
import {
  Alert,
  Button,
  Checkbox,
  EmptyState,
  Input,
  Loading,
  Modal,
  Pagination,
  Select,
  SkeletonRows,
  StatusCell,
  VerdictBadge,
  Window,
} from '@/components/ui';

const VERDICTS = ['ACCEPTED', 'WRONG_ANSWER', 'TIME_LIMIT_EXCEEDED', 'MEMORY_LIMIT_EXCEEDED', 'RUNTIME_ERROR', 'COMPILATION_ERROR', 'QUEUED', 'JUDGING'];
const PAGE_SIZE = 25;

export function SubmissionsPage() {
  useDocumentTitle('Submissions');
  const { user } = useAuthStore();
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const verdict = params.get('verdict') ?? '';
  const mine = params.get('mine') === '1' && !!user;
  const [problem, setProblem] = useState(params.get('problemSlug') ?? '');
  const problemSlug = useDebounced(problem.trim().toLowerCase(), 400);
  const [openId, setOpenId] = useState<string | null>(null);

  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!('page' in patch)) next.delete('page');
    setParams(next, { replace: true });
  };

  const qs = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
  if (verdict) qs.set('verdict', verdict);
  if (problemSlug) qs.set('problemSlug', problemSlug);
  if (mine && user) qs.set('userId', user.id);

  const list = useQuery({
    queryKey: ['submissions', qs.toString()],
    queryFn: () => api.get<Paginated<SubmissionListItem>>(`/submissions?${qs}`),
    placeholderData: keepPreviousData,
    refetchInterval: (q) => (q.state.data?.data.some((s) => isPendingVerdict(s.verdict)) ? 3000 : false),
  });

  const rows = list.data?.data ?? [];

  return (
    <Container>
      <PageHeader eyebrow="Status" title="Submissions" description="Every verdict from the judge, newest first." />

      <Window
        title="Judge Queue"
        icon={<ListChecks size={14} />}
        flush
        menubar={
          <div className="flex flex-wrap items-center gap-2 w-full p-1">
            <Input
              aria-label="Filter by problem slug"
              placeholder="Problem slug (e.g. two-sum)"
              value={problem}
              onChange={(e) => {
                setProblem(e.target.value);
                set({ problemSlug: e.target.value.trim().toLowerCase() || null });
              }}
              className="flex-1 min-w-[180px] max-w-xs"
            />
            <Select aria-label="Verdict" value={verdict} onChange={(e) => set({ verdict: e.target.value || null })}>
              <option value="">All verdicts</option>
              {VERDICTS.map((v) => (
                <option key={v} value={v}>{getVerdict(v).label}</option>
              ))}
            </Select>
            {user && <Checkbox id="mine-only" label="Only mine" checked={mine} onChange={(v) => set({ mine: v ? '1' : null })} />}
          </div>
        }
        statusbar={
          <>
            <StatusCell>{list.data ? `${list.data.pagination.total} submissions` : 'Loading…'}</StatusCell>
            {rows.some((s) => isPendingVerdict(s.verdict)) && <StatusCell fit>Judging… auto-refresh</StatusCell>}
          </>
        }
      >
        {list.isError ? (
          <div className="p-4"><Alert tone="bad">{(list.error as Error).message}</Alert></div>
        ) : list.isLoading ? (
          <SkeletonRows rows={10} cols={6} />
        ) : rows.length === 0 ? (
          <EmptyState icon={<ListChecks />} title="No submissions match" />
        ) : (
          <div className="os-table-wrap" style={{ opacity: list.isFetching && !list.isRefetching ? 0.6 : 1 }}>
            <table className="os-table">
              <thead>
                <tr>
                  <th style={{ width: 96 }}><span className="os-th">ID</span></th>
                  <th style={{ width: 120 }}><span className="os-th">When</span></th>
                  <th><span className="os-th">User</span></th>
                  <th><span className="os-th">Problem</span></th>
                  <th><span className="os-th">Language</span></th>
                  <th><span className="os-th">Verdict</span></th>
                  <th style={{ width: 90 }}><span className="os-th os-th--right">Time</span></th>
                  <th style={{ width: 100 }}><span className="os-th os-th--right">Memory</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s.id} className={s.user.handle === user?.handle ? 'is-me' : ''}>
                    <td>
                      <button type="button" className="os-row-link t-mono bg-transparent border-0 p-0 cursor-pointer" onClick={() => setOpenId(s.id)}>
                        {s.id.slice(0, 8)}
                      </button>
                    </td>
                    <td className="t-secondary whitespace-nowrap" title={formatDateTime(s.createdAt)}>{timeAgo(s.createdAt)}</td>
                    <td><Link to={`/user/${s.user.handle}`} className="font-semibold">{s.user.handle}</Link></td>
                    <td><Link to={`/problems/${s.problem.slug}`}>{s.problem.title}</Link></td>
                    <td className="whitespace-nowrap">{s.language ?? '—'}</td>
                    <td><VerdictBadge verdict={s.verdict} /></td>
                    <td className="num">{s.executionTimeMs !== null ? `${s.executionTimeMs} ms` : '—'}</td>
                    <td className="num">{formatMemory(s.memoryUsedKb)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {list.data && list.data.pagination.totalPages > 1 && (
          <div className="p-3">
            <Pagination page={page} totalPages={list.data.pagination.totalPages} onChange={(p) => set({ page: String(p) })} />
          </div>
        )}
      </Window>

      <SubmissionModal id={openId} onClose={() => setOpenId(null)} />
    </Container>
  );
}

function SubmissionModal({ id, onClose }: { id: string | null; onClose: () => void }) {
  const q = useQuery({
    queryKey: ['submission', id],
    enabled: !!id,
    queryFn: () =>
      api.get<{ submission: SubmissionDetail & { sourceCode?: string; user: { handle: string }; problem: { slug: string; title: string } } }>(
        `/submissions/${id}`,
      ),
    refetchInterval: (query) => (query.state.data && isPendingVerdict(query.state.data.submission.verdict) ? 2000 : false),
  });
  const s = q.data?.submission;

  return (
    <Modal open={!!id} onClose={onClose} title={`Submission ${id?.slice(0, 8) ?? ''}`} width={760} footer={<Button onClick={onClose}>Close</Button>}>
      {q.isLoading || !s ? (
        <Loading />
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <VerdictBadge verdict={s.verdict} />
            <Link to={`/problems/${s.problem.slug}`} onClick={onClose} className="font-semibold">{s.problem.title}</Link>
            <span className="t-muted text-[13px]">by {s.user.handle} · {formatDateTime(s.createdAt)}</span>
          </div>
          <div className="flex gap-4 text-[13px] t-mono t-secondary">
            <span className="inline-flex items-center gap-1"><Clock size={12} />{s.executionTimeMs ?? '—'} ms</span>
            <span className="inline-flex items-center gap-1"><HardDrive size={12} />{formatMemory(s.memoryUsedKb)}</span>
          </div>
          {s.compilationOutput && <pre className="os-pre" style={{ color: 'var(--bad)' }}>{s.compilationOutput}</pre>}
          {s.results && s.results.length > 0 && (
            <ul className="list-none m-0 p-0 grid gap-1.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))' }}>
              {s.results.map((r) => {
                const v = getVerdict(r.verdict);
                return (
                  <li key={r.id} className={`os-badge os-badge--${v.tone} justify-between`} title={v.label}>
                    <span className="t-mono">#{r.testCaseIndex + 1}</span>
                    <span>{v.short}</span>
                  </li>
                );
              })}
            </ul>
          )}
          {s.sourceCode !== undefined ? (
            <pre className="os-pre max-h-[360px] overflow-auto" style={{ whiteSpace: 'pre' }}>{s.sourceCode}</pre>
          ) : (
            <p className="m-0 text-[13px] t-muted">Source code is only visible to its author.</p>
          )}
        </div>
      )}
    </Modal>
  );
}
