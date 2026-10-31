import { useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Trophy } from 'lucide-react';
import { api } from '@/lib/api';
import type { ContestListItem, Paginated } from '@/lib/types';
import { useDocumentTitle } from '@/lib/hooks';
import { Container, PageHeader } from '@/components/Layout';
import { ContestCard } from '@/components/ContestCard';
import { Alert, EmptyState, Pagination, Skeleton, Tabs } from '@/components/ui';

type TabId = 'RUNNING' | 'UPCOMING' | 'ENDED';
const TAB_LABEL: Record<TabId, string> = { RUNNING: 'Live', UPCOMING: 'Upcoming', ENDED: 'Past' };

export function ContestsPage() {
  useDocumentTitle('Contests');
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();

  // Counts per status (cheap: limit=1, read pagination.total)
  const counts = useQuery({
    queryKey: ['contests', 'counts'],
    queryFn: async () => {
      const [r, u, e] = await Promise.all(
        (['RUNNING', 'UPCOMING', 'ENDED'] as const).map((s) => api.get<Paginated<ContestListItem>>(`/contests?status=${s}&limit=1`)),
      );
      return { RUNNING: r!.pagination.total, UPCOMING: u!.pagination.total, ENDED: e!.pagination.total };
    },
  });

  const requested = params.get('tab') as TabId | null;
  const tab: TabId =
    requested && requested in TAB_LABEL ? requested : counts.data && counts.data.RUNNING === 0 ? 'UPCOMING' : 'RUNNING';
  const page = Math.max(1, Number(params.get('page')) || 1);

  const list = useQuery({
    queryKey: ['contests', tab, page],
    queryFn: () => api.get<Paginated<ContestListItem>>(`/contests?status=${tab}&limit=12&page=${page}`),
  });

  const items =
    tab === 'UPCOMING'
      ? [...(list.data?.data ?? [])].sort((a, b) => +new Date(a.startTime) - +new Date(b.startTime))
      : list.data?.data ?? [];

  const refresh = () => qc.invalidateQueries({ queryKey: ['contests'] });
  const setTab = (t: TabId) => setParams({ tab: t }, { replace: true });

  return (
    <Container>
      <PageHeader
        eyebrow="Compete"
        title="Contests"
        description="ICPC-style rounds: one point per solved problem, ties broken by penalty time (+20 min per rejected attempt)."
      />
      <Tabs
        tabs={(Object.keys(TAB_LABEL) as TabId[]).map((id) => ({ id, label: TAB_LABEL[id], count: counts.data?.[id] }))}
        value={tab}
        onChange={setTab}
        panelClassName="p-4 sm:p-5"
      >
        {list.isError ? (
          <Alert tone="bad">Couldn't load contests. {(list.error as Error).message}</Alert>
        ) : list.isLoading ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-56" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Trophy />}
            title={tab === 'RUNNING' ? 'No contest is live right now' : tab === 'UPCOMING' ? 'Nothing scheduled yet' : 'No past contests'}
            description={tab === 'ENDED' ? undefined : 'Check the other tabs or come back later.'}
          />
        ) : (
          <>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {items.map((c, i) => (
                <div key={c.id} className="window-open h-full" style={{ ['--open-delay' as string]: `${i * 50}ms` }}>
                  <ContestCard contest={c} onStatusChange={refresh} />
                </div>
              ))}
            </div>
            {list.data && list.data.pagination.totalPages > 1 && (
              <div className="mt-6">
                <Pagination
                  page={page}
                  totalPages={list.data.pagination.totalPages}
                  onChange={(p) => setParams({ tab, page: String(p) }, { replace: true })}
                />
              </div>
            )}
          </>
        )}
      </Tabs>
    </Container>
  );
}
