import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { FilterX, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import type { Paginated, ProblemListItem } from '@/lib/types';
import { DIFFICULTY_BANDS } from '@/lib/format';
import { useDebounced, useDocumentTitle, useHotkey } from '@/lib/hooks';
import { useAuthStore } from '@/stores/auth';
import { Container, PageHeader } from '@/components/Layout';
import { ProblemTable, type ProblemSort } from '@/components/ProblemTable';
import {
  Alert,
  Button,
  DifficultyBadge,
  EmptyState,
  GroupBox,
  IconProblems,
  Input,
  Pagination,
  SearchBar,
  Select,
  SkeletonRows,
  StatusCell,
  Tag,
  Window,
} from '@/components/ui';

interface TagWithCount {
  id: string;
  name: string;
  color: string;
  problemCount: number;
}

const PAGE_SIZE = 20;
const STATUS_OPTIONS = [
  { id: 'all', label: 'All' },
  { id: 'unsolved', label: 'Unsolved' },
  { id: 'attempted', label: 'Attempted' },
  { id: 'solved', label: 'Solved' },
] as const;

export function ProblemsPage() {
  useDocumentTitle('Problems');
  const { user, isAuthenticated } = useAuthStore();
  const [params, setParams] = useSearchParams();
  const searchRef = useRef<HTMLInputElement>(null);

  const page = Math.max(1, Number(params.get('page')) || 1);
  const sortBy = (params.get('sortBy') as ProblemSort) || 'createdAt';
  const order = (params.get('order') as 'asc' | 'desc') || (sortBy === 'difficulty' ? 'asc' : 'desc');
  const minRating = params.get('minRating') ?? '';
  const maxRating = params.get('maxRating') ?? '';
  const status = params.get('status') ?? 'all';
  const selectedTags = useMemo(() => (params.get('tags') ? params.get('tags')!.split(',').filter(Boolean) : []), [params]);

  const [search, setSearch] = useState(params.get('search') ?? '');
  const debouncedSearch = useDebounced(search, 300);

  /** Update URL params, resetting to page 1 unless page is being set. */
  const update = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v === null || v === '') next.delete(k);
      else next.set(k, v);
    }
    if (!('page' in patch)) next.delete('page');
    setParams(next, { replace: true });
  };

  useEffect(() => {
    if ((params.get('search') ?? '') !== debouncedSearch) update({ search: debouncedSearch || null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  useHotkey((e) => e.key === '/', (e) => {
    e.preventDefault();
    searchRef.current?.focus();
  });

  const query = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE), sortBy, order });
  if (debouncedSearch) query.set('search', debouncedSearch);
  if (minRating) query.set('minRating', minRating);
  if (maxRating) query.set('maxRating', maxRating);
  if (isAuthenticated && status !== 'all') query.set('status', status);
  selectedTags.forEach((t) => query.append('tags', t));
  const qs = query.toString();

  const problems = useQuery({
    queryKey: ['problems', qs, isAuthenticated],
    queryFn: () => api.get<Paginated<ProblemListItem>>(`/problems?${qs}`),
    placeholderData: keepPreviousData,
  });

  const tags = useQuery({
    queryKey: ['tags'],
    queryFn: () => api.get<{ tags: TagWithCount[] }>('/problems/tags/all'),
    staleTime: 5 * 60_000,
  });

  // Recommendations: unsolved problems around the user's rating
  const rating = user?.rating ?? 0;
  const recommended = useQuery({
    queryKey: ['problems', 'recommended', rating],
    enabled: isAuthenticated,
    queryFn: () =>
      api.get<Paginated<ProblemListItem>>(
        `/problems?status=unsolved&minRating=${Math.max(1, rating - 200)}&maxRating=${rating + 300}&sortBy=solvedCount&order=desc&limit=4`,
      ),
  });

  const activeBand = DIFFICULTY_BANDS.find((b) => String(b.min || '') === minRating && String(b.max) === maxRating)?.key ?? null;
  const filtersActive = !!(debouncedSearch || minRating || maxRating || selectedTags.length || status !== 'all');

  const toggleTag = (name: string) => {
    const next = selectedTags.includes(name) ? selectedTags.filter((t) => t !== name) : [...selectedTags, name];
    update({ tags: next.join(',') || null });
  };

  const onSort = (field: ProblemSort) => {
    const nextOrder = sortBy === field ? (order === 'asc' ? 'desc' : 'asc') : field === 'difficulty' ? 'asc' : 'desc';
    update({ sortBy: field, order: nextOrder });
  };

  const clearAll = () => {
    setSearch('');
    setParams(new URLSearchParams(), { replace: true });
  };

  const data = problems.data;

  return (
    <Container>
      <PageHeader
        eyebrow="Practice"
        title="Problems"
        description="Filter by difficulty, topic and status. Press / to search."
      />

      {isAuthenticated && recommended.data && recommended.data.data.length > 0 && (
        <Window title="Recommended for you" icon={<Sparkles size={14} />} className="mb-6 window-open" tone="gradient">
          <p className="m-0 mb-3 text-[13px] t-secondary">Unsolved problems near your rating ({rating}).</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {recommended.data.data.map((p) => (
              <Link
                key={p.id}
                to={`/problems/${p.slug}`}
                className="os-window os-window--interactive p-3 flex flex-col gap-2 no-underline hover:no-underline"
                style={{ color: 'var(--text)' }}
              >
                <span className="font-semibold leading-snug">{p.title}</span>
                <span className="flex items-center justify-between gap-2">
                  <DifficultyBadge rating={p.difficulty} showLabel={false} />
                  <span className="text-[12px] t-muted">{p.solvedCount} solved</span>
                </span>
              </Link>
            ))}
          </div>
        </Window>
      )}

      <div className="grid gap-6 lg:grid-cols-[280px_1fr] items-start">
        {/* Filters */}
        <Window title="Filters" as="aside" controls={false} className="lg:sticky lg:top-[calc(var(--taskbar-h)+16px)]">
          <div className="flex flex-col gap-4">
            <GroupBox legend="Difficulty">
              <div className="flex flex-wrap gap-1.5">
                {DIFFICULTY_BANDS.map((b) => (
                  <Button
                    key={b.key}
                    size="sm"
                    pressed={activeBand === b.key}
                    onClick={() =>
                      activeBand === b.key
                        ? update({ minRating: null, maxRating: null })
                        : update({ minRating: b.min ? String(b.min) : null, maxRating: String(b.max) })
                    }
                  >
                    {b.label}
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-3">
                <Input
                  aria-label="Minimum rating"
                  type="number"
                  inputMode="numeric"
                  placeholder="Min"
                  value={minRating}
                  min={0}
                  step={100}
                  onChange={(e) => update({ minRating: e.target.value || null })}
                />
                <span className="t-muted">–</span>
                <Input
                  aria-label="Maximum rating"
                  type="number"
                  inputMode="numeric"
                  placeholder="Max"
                  value={maxRating}
                  min={0}
                  step={100}
                  onChange={(e) => update({ maxRating: e.target.value || null })}
                />
              </div>
            </GroupBox>

            {isAuthenticated && (
              <GroupBox legend="Status">
                <div className="os-seg w-full" role="radiogroup" aria-label="Status">
                  {STATUS_OPTIONS.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      role="radio"
                      aria-checked={status === o.id}
                      aria-pressed={status === o.id}
                      className="os-btn os-btn--sm flex-1"
                      onClick={() => update({ status: o.id === 'all' ? null : o.id })}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </GroupBox>
            )}

            <GroupBox legend="Tags">
              {tags.isLoading ? (
                <SkeletonRows rows={3} cols={2} />
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-64 overflow-y-auto">
                  {tags.data?.tags.map((t) => (
                    <Tag key={t.id} tag={t} count={t.problemCount} selected={selectedTags.includes(t.name)} onClick={() => toggleTag(t.name)} />
                  ))}
                </div>
              )}
            </GroupBox>

            <Button onClick={clearAll} disabled={!filtersActive} leading={<FilterX size={14} />} block>
              Clear filters
            </Button>
          </div>
        </Window>

        {/* Explorer */}
        <Window
          title="C:\\PROBLEMS"
          icon={<IconProblems width={16} height={16} />}
          flush
          menubar={
            <div className="flex flex-wrap items-center gap-2 w-full p-1">
              <SearchBar
                ref={searchRef}
                id="problem-search"
                placeholder="Search by title or slug…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                shortcut="/"
                wrapperClassName="flex-1 min-w-[200px]"
                aria-label="Search problems"
              />
              <Select
                aria-label="Sort problems"
                value={`${sortBy}:${order}`}
                onChange={(e) => {
                  const [f, o] = e.target.value.split(':');
                  update({ sortBy: f!, order: o! });
                }}
              >
                <option value="createdAt:desc">Newest</option>
                <option value="createdAt:asc">Oldest</option>
                <option value="difficulty:asc">Easiest</option>
                <option value="difficulty:desc">Hardest</option>
                <option value="solvedCount:desc">Most solved</option>
                <option value="solvedCount:asc">Least solved</option>
              </Select>
            </div>
          }
          statusbar={
            <>
              <StatusCell>{data ? `${data.pagination.total} object(s)` : 'Loading…'}</StatusCell>
              {selectedTags.length > 0 && <StatusCell fit>Tags: {selectedTags.join(', ')}</StatusCell>}
              <StatusCell fit>
                Page {data?.pagination.page ?? page} / {Math.max(1, data?.pagination.totalPages ?? 1)}
              </StatusCell>
            </>
          }
        >
          {problems.isError ? (
            <div className="p-4">
              <Alert tone="bad">Couldn't load problems. {(problems.error as Error).message}</Alert>
            </div>
          ) : problems.isLoading ? (
            <SkeletonRows rows={10} cols={5} />
          ) : data && data.data.length > 0 ? (
            <div style={{ opacity: problems.isFetching ? 0.6 : 1, transition: 'opacity 150ms' }}>
              <ProblemTable
                problems={data.data}
                startIndex={(page - 1) * PAGE_SIZE}
                sort={sortBy}
                order={order}
                onSort={onSort}
                onTagClick={toggleTag}
                showStatus={isAuthenticated}
              />
            </div>
          ) : (
            <EmptyState
              icon={<IconProblems />}
              title="No problems match"
              description="Try a wider rating range or fewer tags."
              action={filtersActive ? <Button size="sm" onClick={clearAll}>Clear filters</Button> : undefined}
            />
          )}
          {data && data.pagination.totalPages > 1 && (
            <div className="p-3">
              <Pagination page={page} totalPages={data.pagination.totalPages} onChange={(p) => update({ page: String(p) })} />
            </div>
          )}
        </Window>
      </div>
    </Container>
  );
}
