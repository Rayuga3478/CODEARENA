import { Link } from 'react-router-dom';
import { Calendar, Clock, Users, ListOrdered } from 'lucide-react';
import type { ContestListItem } from '@/lib/types';
import { Badge, Countdown, LinkButton, Window } from '@/components/ui';
import { formatDateTime, formatDuration } from '@/lib/format';

export function ContestStatusBadge({ status }: { status: ContestListItem['status'] }) {
  if (status === 'RUNNING')
    return (
      <Badge tone="ok">
        <span className="os-dot os-dot--pulse" /> Live
      </Badge>
    );
  if (status === 'UPCOMING') return <Badge tone="info">Upcoming</Badge>;
  if (status === 'ENDED') return <Badge tone="muted">Ended</Badge>;
  return <Badge>{status}</Badge>;
}

/** Contest "program window" card. */
export function ContestCard({ contest, onStatusChange }: { contest: ContestListItem; onStatusChange?: () => void }) {
  const live = contest.status === 'RUNNING';
  const upcoming = contest.status === 'UPCOMING';
  return (
    <Window
      as="article"
      title={`${contest.title}.exe`}
      tone={live ? 'gradient' : contest.status === 'ENDED' ? 'inactive' : 'default'}
      interactive
      elevated={live}
      className="h-full"
      bodyClassName="flex flex-col gap-3 h-full"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="m-0 text-[18px] font-semibold leading-snug">
          <Link to={`/contests/${contest.id}`} className="os-row-link">{contest.title}</Link>
        </h3>
        <ContestStatusBadge status={contest.status} />
      </div>
      {contest.description && <p className="m-0 text-[14px] t-secondary line-clamp-2">{contest.description}</p>}

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 m-0 text-[13px]">
        <Meta icon={Calendar} label="Start" value={formatDateTime(contest.startTime)} />
        <Meta icon={Clock} label="Duration" value={formatDuration(contest.duration)} />
        <Meta icon={Users} label="Participants" value={String(contest.participantCount)} />
        <Meta icon={ListOrdered} label="Problems" value={String(contest.problemCount)} />
      </dl>

      <div className="mt-auto pt-2 flex flex-wrap items-center justify-between gap-3">
        {(live || upcoming) && (
          <div className="flex flex-col gap-1">
            <span className="t-ui text-[12px] t-muted">{live ? 'Ends in' : 'Starts in'}</span>
            <Countdown target={live ? contest.endTime : contest.startTime} size="sm" onComplete={onStatusChange} />
          </div>
        )}
        <div className="flex gap-2 ml-auto">
          {contest.status === 'ENDED' ? (
            <LinkButton to={`/contests/${contest.id}?tab=standings`} size="sm">View standings</LinkButton>
          ) : (
            <LinkButton to={`/contests/${contest.id}`} size="sm" variant={live ? 'primary' : 'default'}>
              {live ? 'Enter contest' : 'Details & register'}
            </LinkButton>
          )}
        </div>
      </div>
    </Window>
  );
}

function Meta({ icon: Icon, label, value }: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <Icon size={14} className="t-muted flex-none" />
      <dt className="sr-only">{label}</dt>
      <dd className="m-0 truncate">{value}</dd>
    </div>
  );
}
