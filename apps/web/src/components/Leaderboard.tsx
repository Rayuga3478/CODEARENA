import { Link } from 'react-router-dom';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import type { LeaderboardRow } from '@/lib/types';
import { RatingBadge, UserAvatar, UserLink } from '@/components/ui';
import { getTier, tierClass } from '@/lib/format';

const PODIUM = [
  { tone: 'gold', label: '1st', medal: '#d4a017' },
  { tone: 'silver', label: '2nd', medal: '#9aa0aa' },
  { tone: 'bronze', label: '3rd', medal: '#c27a3a' },
] as const;

export function RatingChange({ value }: { value: number | null }) {
  if (value === null) return <span className="t-muted inline-flex items-center gap-1"><Minus size={12} />—</span>;
  const up = value > 0;
  const Icon = value === 0 ? Minus : up ? TrendingUp : TrendingDown;
  return (
    <span className="t-mono inline-flex items-center gap-1 justify-end" style={{ color: value === 0 ? 'var(--text-3)' : up ? 'var(--ok)' : 'var(--bad)' }}>
      <Icon size={12} />
      {up ? '+' : ''}
      {value}
    </span>
  );
}

/** Top-3 podium windows. */
export function Podium({ rows, metricLabel, metric }: { rows: LeaderboardRow[]; metricLabel: string; metric: (r: LeaderboardRow) => number }) {
  const top = rows.slice(0, 3);
  if (top.length === 0) return null;
  // Visual order: 2nd, 1st, 3rd on desktop
  const order = top.length === 3 ? [1, 0, 2] : top.map((_, i) => i);
  return (
    <div className="grid gap-4 sm:grid-cols-3 items-end mb-6">
      {order.map((idx) => {
        const r = top[idx]!;
        const p = PODIUM[idx]!;
        return (
          <div key={r.handle} className={`os-window os-window--elevated window-open ${idx === 0 ? 'sm:-translate-y-4' : ''}`} style={{ ['--open-delay' as string]: `${idx * 80}ms` }}>
            <header className={`os-titlebar os-titlebar--${p.tone}`}>
              <span className="os-titlebar__title">#{r.rank} · {p.label} place</span>
            </header>
            <div className="os-body flex flex-col items-center text-center gap-2 py-5">
              <div className="relative">
                <UserAvatar handle={r.handle} avatar={r.avatar} size={idx === 0 ? 72 : 60} />
                <span className="absolute -bottom-2 -right-2 grid place-items-center w-7 h-7 t-ui text-[13px] font-bold text-black" style={{ background: p.medal, boxShadow: 'inset -1px -1px #000, inset 1px 1px #fff' }}>
                  {r.rank}
                </span>
              </div>
              <Link to={`/user/${r.handle}`} className={`t-display text-[22px] ${tierClass(r.rating)}`}>{r.handle}</Link>
              <span className="t-ui text-[12px] t-muted">{getTier(r.rating).title}</span>
              <span className="os-lcd" style={{ fontSize: 22 }}>{metric(r)}</span>
              <span className="t-ui text-[12px] t-muted">{metricLabel}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Ranking table (desktop) + list (mobile). */
export function LeaderboardTable({
  rows,
  period,
  meHandle,
}: {
  rows: LeaderboardRow[];
  period: 'all' | 'week' | 'month';
  meHandle?: string;
}) {
  const showPeriod = period !== 'all';
  return (
    <>
      <div className="os-table-wrap hidden md:block">
        <table className="os-table">
          <thead>
            <tr>
              <th style={{ width: 72 }}><span className="os-th">Rank</span></th>
              <th><span className="os-th">User</span></th>
              <th style={{ width: 120 }}><span className="os-th">Country</span></th>
              {showPeriod && <th style={{ width: 130 }}><span className="os-th os-th--right">Solved ({period === 'week' ? '7d' : '30d'})</span></th>}
              <th style={{ width: 110 }}><span className="os-th os-th--right">Rating</span></th>
              <th style={{ width: 110 }}><span className="os-th os-th--right">Max</span></th>
              <th style={{ width: 100 }}><span className="os-th os-th--right">Solved</span></th>
              <th style={{ width: 100 }}><span className="os-th os-th--right">Contests</span></th>
              <th style={{ width: 100 }}><span className="os-th os-th--right">Change</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.handle} className={r.handle === meHandle ? 'is-me' : ''}>
                <td className="t-mono font-bold">
                  {r.rank <= 3 ? <span style={{ color: PODIUM[r.rank - 1]!.medal }}>■ </span> : null}
                  {r.rank}
                </td>
                <td>
                  <div className="flex items-center gap-3">
                    <UserAvatar handle={r.handle} avatar={r.avatar} size={28} />
                    <div className="min-w-0">
                      <UserLink handle={r.handle} rating={r.rating} />
                      <div className="text-[12px] t-muted">{getTier(r.rating).title}</div>
                    </div>
                  </div>
                </td>
                <td className="t-secondary">{r.country ?? <span className="t-muted">—</span>}</td>
                {showPeriod && <td className="num font-bold">{r.periodSolved}</td>}
                <td className="num"><RatingBadge rating={r.rating} /></td>
                <td className="num"><span className={tierClass(r.maxRating)}>{r.maxRating}</span></td>
                <td className="num">{r.solvedCount}</td>
                <td className="num">{r.contestCount}</td>
                <td className="num"><RatingChange value={r.lastChange} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="md:hidden list-none m-0 p-0">
        {rows.map((r) => (
          <li key={r.handle} className={`flex items-center gap-3 p-3 border-b ${r.handle === meHandle ? 'is-me' : ''}`} style={{ borderColor: 'color-mix(in srgb, var(--lo) 35%, transparent)' }}>
            <span className="t-mono font-bold w-8 text-center" style={{ color: r.rank <= 3 ? PODIUM[r.rank - 1]!.medal : undefined }}>{r.rank}</span>
            <UserAvatar handle={r.handle} avatar={r.avatar} size={32} />
            <div className="flex-1 min-w-0">
              <UserLink handle={r.handle} rating={r.rating} />
              <div className="text-[12px] t-muted">{r.solvedCount} solved · {r.contestCount} contests</div>
            </div>
            <div className="text-right">
              <RatingBadge rating={r.rating} />
              <div className="text-[12px]">{showPeriod ? <span className="t-mono">{r.periodSolved} in {period === 'week' ? '7d' : '30d'}</span> : <RatingChange value={r.lastChange} />}</div>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
