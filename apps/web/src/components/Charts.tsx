import { useMemo } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { RATING_TIERS, formatDate } from '@/lib/format';

/** GitHub-style yearly activity heatmap from a { 'YYYY-MM-DD': count } map. */
export function ActivityHeatmap({ activity }: { activity: Record<string, number> }) {
  const { weeks, total, months } = useMemo(() => {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setUTCDate(start.getUTCDate() - 364 - start.getUTCDay()); // align to Sunday
    const weeks: { date: string; count: number }[][] = [];
    const months: { index: number; label: string }[] = [];
    let total = 0;
    const cursor = new Date(start);
    let lastMonth = -1;
    while (cursor <= today) {
      const week: { date: string; count: number }[] = [];
      for (let d = 0; d < 7; d++) {
        const key = cursor.toISOString().slice(0, 10);
        const count = cursor <= today ? activity[key] ?? 0 : -1;
        if (count > 0) total += count;
        week.push({ date: key, count });
        if (d === 0 && cursor.getUTCMonth() !== lastMonth) {
          lastMonth = cursor.getUTCMonth();
          months.push({ index: weeks.length, label: cursor.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }) });
        }
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
      weeks.push(week);
    }
    return { weeks, total, months };
  }, [activity]);

  const level = (c: number) => (c <= 0 ? 0 : c < 2 ? 1 : c < 4 ? 2 : c < 7 ? 3 : 4);
  const colors = [
    'var(--well-alt)',
    'color-mix(in srgb, var(--ok) 30%, var(--well))',
    'color-mix(in srgb, var(--ok) 55%, var(--well))',
    'color-mix(in srgb, var(--ok) 80%, var(--well))',
    'var(--ok)',
  ];

  return (
    <div>
      <div className="overflow-x-auto pb-2">
        <div className="inline-block min-w-full">
          <div className="relative h-4 ml-6 text-[11px] t-ui t-muted">
            {months.map((m) => (
              <span key={`${m.label}-${m.index}`} className="absolute" style={{ left: m.index * 13 }}>
                {m.label}
              </span>
            ))}
          </div>
          <div className="flex gap-[3px]">
            <div className="flex flex-col gap-[3px] mr-1 text-[10px] t-ui t-muted w-5">
              {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((d, i) => (
                <span key={i} className="h-[10px] leading-[10px]">{d}</span>
              ))}
            </div>
            {weeks.map((w, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {w.map((d) => (
                  <span
                    key={d.date}
                    title={d.count >= 0 ? `${d.count} submission${d.count === 1 ? '' : 's'} on ${formatDate(d.date)}` : ''}
                    className="block w-[10px] h-[10px]"
                    style={{
                      background: d.count < 0 ? 'transparent' : colors[level(d.count)],
                      boxShadow: d.count < 0 ? 'none' : 'inset 0 0 0 1px color-mix(in srgb, var(--lo) 30%, transparent)',
                    }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 mt-2 text-[12px] t-muted">
        <span className="t-ui">{total} submissions in the last year</span>
        <span className="flex items-center gap-1 t-ui">
          Less
          {colors.map((c, i) => (
            <span key={i} className="inline-block w-[10px] h-[10px]" style={{ background: c, boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--lo) 30%, transparent)' }} />
          ))}
          More
        </span>
      </div>
    </div>
  );
}

interface RatingPoint {
  ratingBefore: number;
  ratingAfter: number;
  rank: number | null;
  createdAt: string;
  contest: { title: string };
}

/** Rating history line chart with tier bands. */
export function RatingChart({ history }: { history: RatingPoint[] }) {
  const data = history.map((h) => ({
    t: new Date(h.createdAt).getTime(),
    rating: h.ratingAfter,
    delta: h.ratingAfter - h.ratingBefore,
    contest: h.contest.title,
    rank: h.rank,
  }));
  const ratings = data.map((d) => d.rating).concat(history.length ? [history[0]!.ratingBefore] : []);
  const min = Math.max(0, Math.floor((Math.min(...ratings) - 150) / 100) * 100);
  const max = Math.ceil((Math.max(...ratings) + 150) / 100) * 100;

  return (
    <div style={{ width: '100%', height: 260 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
          {RATING_TIERS.map((tier, i) => {
            const next = RATING_TIERS[i + 1]?.min ?? 5000;
            if (next <= min || tier.min >= max) return null;
            return (
              <ReferenceArea
                key={tier.key}
                y1={Math.max(tier.min, min)}
                y2={Math.min(next, max)}
                fill={`var(--tier-${tier.key})`}
                fillOpacity={0.12}
                ifOverflow="hidden"
              />
            );
          })}
          <CartesianGrid stroke="var(--lo)" strokeOpacity={0.25} strokeDasharray="2 4" />
          <XAxis
            dataKey="t"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(t) => new Date(t).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
            tick={{ fontSize: 11, fill: 'var(--text-3)', fontFamily: 'Pixelify Sans' }}
            stroke="var(--lo)"
          />
          <YAxis domain={[min, max]} tick={{ fontSize: 11, fill: 'var(--text-3)', fontFamily: 'Inconsolata' }} stroke="var(--lo)" />
          <Tooltip
            contentStyle={{ background: 'var(--well)', border: '1px solid var(--dk)', borderRadius: 0, boxShadow: '2px 2px 0 #000', fontSize: 13 }}
            labelFormatter={(t) => formatDate(new Date(Number(t)))}
            formatter={(value: number, _n, item) => {
              const p = item.payload as (typeof data)[number];
              return [`${value} (${p.delta >= 0 ? '+' : ''}${p.delta})${p.rank ? ` · rank ${p.rank}` : ''}`, p.contest];
            }}
          />
          <Line type="linear" dataKey="rating" stroke="var(--title)" strokeWidth={2} dot={{ r: 3, fill: 'var(--well)', stroke: 'var(--title)', strokeWidth: 2 }} activeDot={{ r: 5 }} isAnimationActive />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
