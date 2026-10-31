/**
 * Shared formatting helpers for the CodeArena UI.
 * Colours are expressed as CSS classes / variables so both themes work.
 */

// ─── Rating tiers ─────────────────────────────────────────────────────────

export interface RatingTier {
  key: 'newbie' | 'pupil' | 'specialist' | 'expert' | 'cm' | 'master' | 'im' | 'gm' | 'lgm';
  title: string;
  min: number;
}

export const RATING_TIERS: RatingTier[] = [
  { key: 'newbie', title: 'Newbie', min: 0 },
  { key: 'pupil', title: 'Pupil', min: 1200 },
  { key: 'specialist', title: 'Specialist', min: 1400 },
  { key: 'expert', title: 'Expert', min: 1600 },
  { key: 'cm', title: 'Candidate Master', min: 1900 },
  { key: 'master', title: 'Master', min: 2100 },
  { key: 'im', title: 'International Master', min: 2300 },
  { key: 'gm', title: 'Grandmaster', min: 2400 },
  { key: 'lgm', title: 'Legendary Grandmaster', min: 2600 },
];

export function getTier(rating: number): RatingTier {
  let tier = RATING_TIERS[0]!;
  for (const t of RATING_TIERS) if (rating >= t.min) tier = t;
  return tier;
}

export const tierClass = (rating: number) => `tier-${getTier(rating).key}`;
export const tierVar = (rating: number) => `var(--tier-${getTier(rating).key})`;

// ─── Problem difficulty ───────────────────────────────────────────────────

export interface DifficultyBand {
  key: 'easy' | 'medium' | 'hard' | 'vhard' | 'expert';
  label: string;
  min: number;
  max: number;
  badge: 'ok' | 'info' | 'purple' | 'warn' | 'bad';
}

export const DIFFICULTY_BANDS: DifficultyBand[] = [
  { key: 'easy', label: 'Easy', min: 0, max: 900, badge: 'ok' },
  { key: 'medium', label: 'Medium', min: 901, max: 1200, badge: 'info' },
  { key: 'hard', label: 'Hard', min: 1201, max: 1600, badge: 'purple' },
  { key: 'vhard', label: 'Very Hard', min: 1601, max: 2100, badge: 'warn' },
  { key: 'expert', label: 'Expert', min: 2101, max: 4000, badge: 'bad' },
];

export function getDifficulty(rating: number): DifficultyBand {
  return DIFFICULTY_BANDS.find((b) => rating <= b.max) ?? DIFFICULTY_BANDS[DIFFICULTY_BANDS.length - 1]!;
}

// ─── Verdicts ─────────────────────────────────────────────────────────────

export interface VerdictInfo {
  label: string;
  short: string;
  tone: 'ok' | 'bad' | 'warn' | 'info' | 'purple' | 'muted';
  pending?: boolean;
}

const VERDICTS: Record<string, VerdictInfo> = {
  ACCEPTED: { label: 'Accepted', short: 'AC', tone: 'ok' },
  WRONG_ANSWER: { label: 'Wrong Answer', short: 'WA', tone: 'bad' },
  TIME_LIMIT_EXCEEDED: { label: 'Time Limit Exceeded', short: 'TLE', tone: 'warn' },
  MEMORY_LIMIT_EXCEEDED: { label: 'Memory Limit Exceeded', short: 'MLE', tone: 'warn' },
  RUNTIME_ERROR: { label: 'Runtime Error', short: 'RE', tone: 'purple' },
  COMPILATION_ERROR: { label: 'Compilation Error', short: 'CE', tone: 'bad' },
  INTERNAL_ERROR: { label: 'Internal Error', short: 'IE', tone: 'muted' },
  QUEUED: { label: 'In queue', short: 'Q', tone: 'info', pending: true },
  JUDGING: { label: 'Judging…', short: '…', tone: 'info', pending: true },
};

export function getVerdict(verdict: string): VerdictInfo {
  return VERDICTS[verdict] ?? { label: verdict, short: verdict.slice(0, 3), tone: 'muted' };
}

export const isPendingVerdict = (v: string) => v === 'QUEUED' || v === 'JUDGING';

// ─── Time ─────────────────────────────────────────────────────────────────

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function timeAgo(date: string | Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(date);
}

/** Split milliseconds into d/h/m/s parts for countdowns. */
export function splitMs(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(s / 86400),
    hours: Math.floor((s % 86400) / 3600),
    minutes: Math.floor((s % 3600) / 60),
    seconds: s % 60,
  };
}

export const pad2 = (n: number) => String(n).padStart(2, '0');

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-US', { notation: n >= 10000 ? 'compact' : 'standard' }).format(n);
}

export function formatMemory(kb: number | null | undefined): string {
  if (!kb) return '—';
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
}

/** Deterministic avatar colour from a handle. */
export function handleColor(handle: string): string {
  const palette = ['#000080', '#008080', '#800080', '#808000', '#a0522d', '#2f4f4f', '#4b0082', '#006400'];
  let h = 0;
  for (const c of handle) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return palette[h % palette.length]!;
}

export function errorMessage(err: unknown, fallback = 'Something went wrong'): string {
  return err instanceof Error && err.message ? err.message : fallback;
}
