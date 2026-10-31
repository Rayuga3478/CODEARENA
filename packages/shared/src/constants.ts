// ─── Verdict Types ───────────────────────────────────────────────────────────
export const Verdict = {
  QUEUED: 'QUEUED',
  COMPILING: 'COMPILING',
  RUNNING: 'RUNNING',
  ACCEPTED: 'ACCEPTED',
  WRONG_ANSWER: 'WRONG_ANSWER',
  TIME_LIMIT_EXCEEDED: 'TIME_LIMIT_EXCEEDED',
  MEMORY_LIMIT_EXCEEDED: 'MEMORY_LIMIT_EXCEEDED',
  RUNTIME_ERROR: 'RUNTIME_ERROR',
  COMPILATION_ERROR: 'COMPILATION_ERROR',
  SYSTEM_ERROR: 'SYSTEM_ERROR',
} as const;

export type VerdictType = (typeof Verdict)[keyof typeof Verdict];

export const TERMINAL_VERDICTS: ReadonlySet<VerdictType> = new Set([
  Verdict.ACCEPTED,
  Verdict.WRONG_ANSWER,
  Verdict.TIME_LIMIT_EXCEEDED,
  Verdict.MEMORY_LIMIT_EXCEEDED,
  Verdict.RUNTIME_ERROR,
  Verdict.COMPILATION_ERROR,
  Verdict.SYSTEM_ERROR,
]);

// ─── User Roles ──────────────────────────────────────────────────────────────
export const UserRole = {
  USER: 'USER',
  MODERATOR: 'MODERATOR',
  ADMIN: 'ADMIN',
} as const;

export type UserRoleType = (typeof UserRole)[keyof typeof UserRole];

// ─── Problem Status ──────────────────────────────────────────────────────────
export const ProblemStatus = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED',
} as const;

export type ProblemStatusType = (typeof ProblemStatus)[keyof typeof ProblemStatus];

// ─── Contest Status ──────────────────────────────────────────────────────────
export const ContestStatus = {
  DRAFT: 'DRAFT',
  UPCOMING: 'UPCOMING',
  RUNNING: 'RUNNING',
  ENDED: 'ENDED',
} as const;

export type ContestStatusType = (typeof ContestStatus)[keyof typeof ContestStatus];

// ─── Contest Visibility ──────────────────────────────────────────────────────
export const ContestVisibility = {
  PUBLIC: 'PUBLIC',
  PRIVATE: 'PRIVATE',
} as const;

export type ContestVisibilityType = (typeof ContestVisibility)[keyof typeof ContestVisibility];

// ─── User Problem Status ─────────────────────────────────────────────────────
export const UserProblemStatus = {
  SOLVED: 'SOLVED',
  ATTEMPTED: 'ATTEMPTED',
} as const;

export type UserProblemStatusType = (typeof UserProblemStatus)[keyof typeof UserProblemStatus];

// ─── Checker Types ───────────────────────────────────────────────────────────
export const CheckerType = {
  TOKEN: 'TOKEN',
  EXACT: 'EXACT',
  SPECIAL: 'SPECIAL',
} as const;

export type CheckerTypeValue = (typeof CheckerType)[keyof typeof CheckerType];

// ─── Rating / Rank System ────────────────────────────────────────────────────
export interface RankDefinition {
  name: string;
  minRating: number;
  maxRating: number;
  color: string;
}

export const RANKS: readonly RankDefinition[] = [
  { name: 'Newbie', minRating: 0, maxRating: 1199, color: '#808080' },
  { name: 'Pupil', minRating: 1200, maxRating: 1399, color: '#008000' },
  { name: 'Specialist', minRating: 1400, maxRating: 1599, color: '#03a89e' },
  { name: 'Expert', minRating: 1600, maxRating: 1899, color: '#0000ff' },
  { name: 'Candidate Master', minRating: 1900, maxRating: 2099, color: '#aa00aa' },
  { name: 'Master', minRating: 2100, maxRating: 2299, color: '#ff8c00' },
  { name: 'International Master', minRating: 2300, maxRating: 2399, color: '#ff8c00' },
  { name: 'Grandmaster', minRating: 2400, maxRating: 2599, color: '#ff0000' },
  { name: 'International Grandmaster', minRating: 2600, maxRating: 2899, color: '#ff0000' },
  { name: 'Legendary Grandmaster', minRating: 2900, maxRating: 9999, color: '#ff0000' },
] as const;

export const DEFAULT_RATING = 1500;

export function getRankForRating(rating: number): RankDefinition {
  for (const rank of RANKS) {
    if (rating >= rank.minRating && rating <= rank.maxRating) {
      return rank;
    }
  }
  return RANKS[0]!;
}

// ─── Difficulty Ratings ──────────────────────────────────────────────────────
export const DIFFICULTY_RATINGS = [
  800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000, 2100, 2200, 2300,
  2400, 2500, 2600, 2700, 2800, 2900, 3000, 3100, 3200, 3300, 3400, 3500,
] as const;

export type DifficultyRating = (typeof DIFFICULTY_RATINGS)[number];

export function getDifficultyLabel(rating: number): string {
  if (rating <= 1000) return 'Easy';
  if (rating <= 1500) return 'Medium';
  if (rating <= 2000) return 'Hard';
  if (rating <= 2500) return 'Very Hard';
  return 'Extreme';
}

export function getDifficultyColor(rating: number): string {
  if (rating <= 1000) return '#43a047';
  if (rating <= 1300) return '#7cb342';
  if (rating <= 1500) return '#fdd835';
  if (rating <= 1800) return '#ff9800';
  if (rating <= 2100) return '#e65100';
  if (rating <= 2400) return '#e91e63';
  return '#b71c1c';
}

// ─── Pagination Defaults ─────────────────────────────────────────────────────
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

// ─── API Response Types ──────────────────────────────────────────────────────
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface PaginatedData<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type PaginatedResponse<T> = ApiSuccessResponse<PaginatedData<T>>;
