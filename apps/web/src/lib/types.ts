/** API response types shared across pages (mirror the Fastify routes). */

export interface TagDTO {
  id: string;
  name: string;
  color: string;
}

export interface ProblemListItem {
  id: string;
  slug: string;
  title: string;
  difficulty: number;
  points: number;
  createdAt: string;
  tags: TagDTO[];
  submissionCount: number;
  solvedCount: number;
  acceptedCount: number;
  acceptanceRate: number | null;
  userStatus: 'SOLVED' | 'ATTEMPTED' | 'NONE' | null;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  pagination: Pagination;
}

export interface ProblemDetail {
  id: string;
  slug: string;
  title: string;
  statement: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string;
  difficulty: number;
  timeLimitMs: number;
  memoryLimitMb: number;
  points: number;
  checkerType: string;
  status: string;
  createdAt: string;
  author: { handle: string; avatar: string | null };
  tags: TagDTO[];
  testCases: { id: string; input: string; expectedOutput: string; explanation: string | null }[];
  submissionCount: number;
}

export type ContestStatus = 'DRAFT' | 'UPCOMING' | 'RUNNING' | 'ENDED';

export interface ContestListItem {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  duration: number;
  status: ContestStatus;
  participantCount: number;
  problemCount: number;
}

export interface ContestDetail extends ContestListItem {
  isRegistered: boolean;
  problems: {
    label: string;
    orderIndex: number;
    points: number;
    problem: { id: string; slug: string; title: string; difficulty: number };
  }[];
}

export interface StandingCell {
  label: string;
  solved: boolean;
  attempts: number;
  timeMin: number | null;
  firstBlood: boolean;
}

export interface StandingRow {
  rank: number;
  handle: string;
  avatar: string | null;
  rating: number;
  solved: number;
  penalty: number;
  lastAcMin: number;
  problems: StandingCell[];
}

export interface LeaderboardRow {
  rank: number;
  handle: string;
  avatar: string | null;
  country: string | null;
  rating: number;
  maxRating: number;
  contestCount: number;
  solvedCount: number;
  periodSolved: number | null;
  lastChange: number | null;
}

export interface SubmissionListItem {
  id: string;
  verdict: string;
  executionTimeMs: number | null;
  memoryUsedKb: number | null;
  languageId: string;
  language: string | null;
  createdAt: string;
  user: { handle: string };
  problem: { slug: string; title: string };
}

export interface SubmissionDetail {
  id: string;
  verdict: string;
  executionTimeMs: number | null;
  memoryUsedKb: number | null;
  compilationOutput: string | null;
  createdAt: string;
  results?: { id: string; testCaseIndex: number; verdict: string; executionTimeMs: number | null; memoryUsedKb: number | null; output: string | null }[];
}

export interface RunResult {
  status: 'QUEUED' | 'RUNNING' | 'OK' | 'COMPILATION_ERROR' | 'RUNTIME_ERROR' | 'TIME_LIMIT_EXCEEDED' | 'INTERNAL_ERROR';
  stdout?: string;
  stderr?: string;
  compileOutput?: string;
  exitCode?: number;
  timeMs?: number;
}

export interface PlatformStats {
  users: number;
  problems: number;
  submissions: number;
  accepted: number;
  contests: number;
  languages: { slug: string; displayName: string }[];
}
