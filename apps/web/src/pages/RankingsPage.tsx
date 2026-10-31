import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Trophy } from 'lucide-react';
import { api } from '@/lib/api';
import type { LeaderboardRow, Paginated } from '@/lib/types';
import { useDebounced, useDocumentTitle } from '@/lib/hooks';
import { useAuthStore } from '@/stores/auth';
import { Container, PageHeader } from '@/components/Layout';
import { LeaderboardTable, Podium } from '@/components/Leaderboard';
import { Alert, EmptyState, Pagination, SearchBar, Select, SkeletonRows, StatusCell, Tabs, Window } from '@/components/ui';

type TabId = 'all' | 'week' | 'month' | 'country';
const PAGE_SIZE = 50;

export function RankingsPage() {
  useDocumentTitle('Rankings');
  const { user } = useAuthStore();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as TabId) || 'all';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const country = params.get('country') ?? '';
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim(), 300);

  const period = tab === 'week' || tab === 'month' ? tab : 'all';
  const qs = new URLSearchParams({ period, page: String(page), limit: String(PAGE_SIZE) });
  if (q) qs.set('search', q);
  if (tab === 'country' && country) qs.set('country', country);

  const lb = useQuery({
    queryKey: ['leaderboard', qs.toString()],
    queryFn: () => api.get<Paginated<LeaderboardRow> & { countries: string[] }>(`/users?${qs}`),
    placeholderData: keepPreviousData,
  });

  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!('page' in patch)) next.delete('page');
    setParams(next, { replace: true });
  };

  const rows = lb.data?.data ?? [];
  const countries = lb.data?.countries ?? [];
  const showPodium = page === 1 && !q && rows.length >= 3 && (tab !== 'country' || !!country);
  const metric = period === 'all' ? (r: LeaderboardRow) => r.rating : (r: LeaderboardRow) => r.periodSolved ?? 0;
  const metricLabel = period === 'all' ? 'rating' : `solved in ${period === 'week' ? '7' : '30'} days`;

  return (
    <Container>
      <PageHeader eyebrow="Compete" title="Rankings" description="Global rating ladder, plus weekly and monthly leaders by problems solved." />

      <Tabs
        tabs={[
          { id: 'all', label: 'Global' },
          { id: 'week', label: 'Weekly' },
          { id: 'month', label: 'Monthly' },
          { id: 'country', label: 'Country' },
        ]}
        value={tab}
        onChange={(t) => set({ tab: t === 'all' ? null : t, country: null })}
        panelClassName="p-3 sm:p-5"
      >
        <div className="flex flex-wrap gap-2 mb-5">
          <SearchBar
            id="rankings-search"
            placeholder="Find a handle…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            wrapperClassName="flex-1 min-w-[200px] max-w-md"
            aria-label="Search handles"
          />
          {tab === 'country' && (
            <Select aria-label="Country" value={country} onChange={(e) => set({ country: e.target.value || null })} disabled={countries.length === 0}>
              <option value="">{countries.length ? 'Select a country…' : 'No countries set yet'}</option>
              {countries.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </Select>
          )}
        </div>

        {tab === 'country' && countries.length === 0 && (
          <Alert tone="info" className="mb-5">No users have set a country on their profile yet, so country rankings are empty.</Alert>
        )}

        {showPodium && <Podium rows={rows} metric={metric} metricLabel={metricLabel} />}

        <Window
          title={tab === 'all' ? 'Global ladder' : tab === 'country' ? `Country: ${country || '—'}` : tab === 'week' ? 'Top solvers — last 7 days' : 'Top solvers — last 30 days'}
          icon={<Trophy size={14} />}
          flush
          controls={false}
          statusbar={
            <>
              <StatusCell>{lb.data ? `${lb.data.pagination.total} ranked` : 'Loading…'}</StatusCell>
              {user && <StatusCell fit>You: {user.handle} · {user.rating}</StatusCell>}
            </>
          }
        >
          {lb.isError ? (
            <div className="p-4"><Alert tone="bad">{(lb.error as Error).message}</Alert></div>
          ) : lb.isLoading ? (
            <SkeletonRows rows={8} cols={5} />
          ) : rows.length === 0 ? (
            <EmptyState
              icon={<Trophy />}
              title={period === 'all' ? 'Nobody here yet' : 'No problems solved in this period'}
              description={q ? `No handle matches “${q}”.` : undefined}
            />
          ) : (
            <div style={{ opacity: lb.isFetching ? 0.6 : 1, transition: 'opacity 150ms' }}>
              <LeaderboardTable rows={rows} period={period} meHandle={user?.handle} />
            </div>
          )}
          {lb.data && lb.data.pagination.totalPages > 1 && (
            <div className="p-3">
              <Pagination page={page} totalPages={lb.data.pagination.totalPages} onChange={(p) => set({ page: String(p) })} />
            </div>
          )}
        </Window>
      </Tabs>
    </Container>
  );
}
