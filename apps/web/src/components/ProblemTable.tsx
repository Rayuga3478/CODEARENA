import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp, ArrowUpDown, Users } from 'lucide-react';
import type { ProblemListItem } from '@/lib/types';
import { DifficultyBadge, StatusIcon, Tag } from '@/components/ui';

export type ProblemSort = 'createdAt' | 'difficulty' | 'solvedCount';

function SortHeader({
  label,
  field,
  sort,
  order,
  onSort,
  align = 'left',
}: {
  label: string;
  field: ProblemSort;
  sort?: ProblemSort;
  order?: 'asc' | 'desc';
  onSort?: (f: ProblemSort) => void;
  align?: 'left' | 'center' | 'right';
}) {
  const active = sort === field;
  const Icon = !active ? ArrowUpDown : order === 'asc' ? ArrowUp : ArrowDown;
  if (!onSort) return <span className={`os-th os-th--${align}`}>{label}</span>;
  return (
    <button type="button" className={`os-th os-th--${align}`} onClick={() => onSort(field)} aria-sort={active ? (order === 'asc' ? 'ascending' : 'descending') : 'none'}>
      {label}
      <Icon size={12} style={{ opacity: active ? 1 : 0.45 }} />
    </button>
  );
}

/** Explorer "details view" problem table. Desktop table, mobile card list. */
export function ProblemTable({
  problems,
  startIndex = 0,
  sort,
  order,
  onSort,
  onTagClick,
  showStatus = true,
}: {
  problems: ProblemListItem[];
  startIndex?: number;
  sort?: ProblemSort;
  order?: 'asc' | 'desc';
  onSort?: (f: ProblemSort) => void;
  onTagClick?: (tag: string) => void;
  showStatus?: boolean;
}) {
  return (
    <>
      {/* Desktop / tablet */}
      <div className="os-table-wrap hidden md:block">
        <table className="os-table">
          <thead>
            <tr>
              {showStatus && <th style={{ width: 44 }}><span className="os-th os-th--center" aria-label="Status">✓</span></th>}
              <th style={{ width: 56 }}><span className="os-th">#</span></th>
              <th><span className="os-th">Problem</span></th>
              <th className="hidden lg:table-cell"><span className="os-th">Tags</span></th>
              <th style={{ width: 170 }}><SortHeader label="Difficulty" field="difficulty" sort={sort} order={order} onSort={onSort} /></th>
              <th style={{ width: 110 }}><SortHeader label="Solved" field="solvedCount" sort={sort} order={order} onSort={onSort} align="right" /></th>
              <th style={{ width: 110 }}><span className="os-th os-th--right">Acceptance</span></th>
            </tr>
          </thead>
          <tbody>
            {problems.map((p, i) => (
              <tr key={p.id} className={p.userStatus === 'SOLVED' ? 'is-selected' : ''}>
                {showStatus && <td className="center"><StatusIcon status={p.userStatus} /></td>}
                <td className="t-mono t-muted">{startIndex + i + 1}</td>
                <td>
                  <Link to={`/problems/${p.slug}`} className="os-row-link">{p.title}</Link>
                  <div className="lg:hidden flex flex-wrap gap-1 mt-1">
                    {p.tags.slice(0, 3).map((t) => <Tag key={t.id} tag={t} />)}
                  </div>
                </td>
                <td className="hidden lg:table-cell">
                  <div className="flex flex-wrap gap-1">
                    {p.tags.map((t) => (
                      <Tag key={t.id} tag={t} onClick={onTagClick ? () => onTagClick(t.name) : undefined} />
                    ))}
                  </div>
                </td>
                <td><DifficultyBadge rating={p.difficulty} /></td>
                <td className="num">
                  <span className="inline-flex items-center gap-1 justify-end"><Users size={12} className="t-muted" />{p.solvedCount}</span>
                </td>
                <td className="num">
                  <AcceptanceBar rate={p.acceptanceRate} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <ul className="md:hidden list-none m-0 p-0 flex flex-col">
        {problems.map((p, i) => (
          <li key={p.id} className="border-b" style={{ borderColor: 'color-mix(in srgb, var(--lo) 35%, transparent)' }}>
            <Link to={`/problems/${p.slug}`} className="flex gap-3 p-3 no-underline hover:no-underline" style={{ color: 'var(--text)' }}>
              {showStatus && <span className="pt-0.5"><StatusIcon status={p.userStatus} /></span>}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-semibold leading-snug">
                    <span className="t-mono t-muted mr-2">{startIndex + i + 1}.</span>
                    {p.title}
                  </span>
                  <DifficultyBadge rating={p.difficulty} showLabel={false} />
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[12px] t-muted">
                  <span className="inline-flex items-center gap-1"><Users size={12} />{p.solvedCount} solved</span>
                  <span>{p.acceptanceRate === null ? '—' : `${p.acceptanceRate}%`} AC</span>
                  {p.tags.slice(0, 2).map((t) => <Tag key={t.id} tag={t} />)}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

export function AcceptanceBar({ rate }: { rate: number | null }) {
  if (rate === null) return <span className="t-muted">—</span>;
  return (
    <span className="inline-flex items-center gap-2 justify-end w-full" title={`${rate}% of submissions accepted`}>
      <span className="hidden xl:inline-block w-12 h-2 bevel-thin-in" style={{ background: 'var(--well-alt)' }}>
        <span className="block h-full" style={{ width: `${Math.min(100, rate)}%`, background: rate >= 50 ? 'var(--ok)' : rate >= 25 ? 'var(--warn)' : 'var(--bad)' }} />
      </span>
      {rate}%
    </span>
  );
}
