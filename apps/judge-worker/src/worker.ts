/**
 * Judge Worker — Phase 4 implementation.
 *
 * Consumes submission jobs from Redis queue,
 * compiles and executes C++17 code with resource limits,
 * compares output against expected results,
 * and stores verdicts back in PostgreSQL.
 *
 * Execution modes:
 * - Native (Windows/Linux): Uses child_process with timeouts
 * - Docker (when available): Uses isolated containers
 */

import 'dotenv/config';
import { PrismaClient } from '../../api/src/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import Redis from 'ioredis';
import { compile, execute, calibrate, type CompileResult, type ExecuteResult } from './sandbox.js';
import { checkOutput } from './checker.js';
import { getLanguageById } from '@cp/shared/languages';

const REDIS_URL = process.env['REDIS_URL'] ?? 'redis://localhost:6379';
const DATABASE_URL = process.env['DATABASE_URL'] ?? '';
const POLL_INTERVAL_MS = 1000;
const MAX_CONCURRENT = 2;

interface JudgeJob {
  submissionId: string;
  problemId: string;
  languageSlug: string;
  sourceCode: string;
}

/** "Run Code" job: execute against custom input, no verdict stored in the DB. */
interface RunJob {
  runId: string;
  userId: string;
  languageSlug: string;
  sourceCode: string;
  input: string;
  timeLimitMs: number;
  memoryLimitMb: number;
}

const SUBMISSION_QUEUE = 'judge:queue';
const RUN_QUEUE = 'judge:run';
const RUN_RESULT_TTL_SEC = 300;
const runResultKey = (id: string) => `judge:run:result:${id}`;

let prisma: PrismaClient;
let redis: Redis;
let activeJobs = 0;
let running = true;

async function initDatabase() {
  const pool = new pg.Pool({ connectionString: DATABASE_URL });
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({ adapter });
}

async function processJob(job: JudgeJob) {
  const { submissionId, problemId, sourceCode } = job;

  console.log(`📥 Processing submission ${submissionId}`);

  try {
    // 1. Mark as JUDGING
    await prisma.submission.update({
      where: { id: submissionId },
      data: { verdict: 'JUDGING' },
    });

    // 2. Get problem and test cases
    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      select: {
        timeLimitMs: true,
        memoryLimitMb: true,
        checkerType: true,
        testCases: {
          orderBy: { orderIndex: 'asc' },
          select: {
            id: true,
            input: true,
            expectedOutput: true,
            orderIndex: true,
          },
        },
      },
    });

    if (!problem || problem.testCases.length === 0) {
      await prisma.submission.update({
        where: { id: submissionId },
        data: { verdict: 'INTERNAL_ERROR' },
      });
      console.error(`❌ Problem ${problemId} not found or no test cases`);
      return;
    }

    // 3. Compile
    console.log(`  🔨 Compiling...`);
    const compileResult = await compile(sourceCode, job.languageSlug);

    if (!compileResult.success) {
      await prisma.submission.update({
        where: { id: submissionId },
        data: {
          verdict: 'COMPILATION_ERROR',
          compilationOutput: compileResult.error?.substring(0, 4096) ?? 'Compilation failed',
        },
      });
      console.log(`  ❌ Compilation Error`);
      return;
    }

    // 4. Execute against each test case
    let overallVerdict = 'ACCEPTED';
    let maxTimeMs = 0;
    let maxMemoryKb = 0;
    const results: Array<{
      testCaseIndex: number;
      verdict: string;
      executionTimeMs: number;
      memoryUsedKb: number;
      output: string;
    }> = [];

    // Scale the time limit by the language multiplier (e.g. Python gets more time than C++)
    const timeMultiplier = getLanguageById(job.languageSlug)?.timeMultiplier ?? 1;
    const effectiveTimeLimitMs = Math.round(problem.timeLimitMs * timeMultiplier);

    for (const tc of problem.testCases) {
      console.log(`  🧪 Running test case ${tc.orderIndex}...`);

      const execResult = await execute(
        compileResult.executablePath!,
        tc.input,
        effectiveTimeLimitMs,
        problem.memoryLimitMb,
        compileResult.interpreter,
      );

      let verdict: string;

      if (execResult.timedOut) {
        verdict = 'TIME_LIMIT_EXCEEDED';
      } else if (execResult.exitCode !== 0) {
        verdict = 'RUNTIME_ERROR';
      } else {
        // Check output
        const correct = checkOutput(
          execResult.stdout,
          tc.expectedOutput,
          problem.checkerType ?? 'TOKEN',
        );
        verdict = correct ? 'ACCEPTED' : 'WRONG_ANSWER';
      }

      maxTimeMs = Math.max(maxTimeMs, execResult.timeMs);
      maxMemoryKb = Math.max(maxMemoryKb, execResult.memoryKb);

      results.push({
        testCaseIndex: tc.orderIndex,
        verdict,
        executionTimeMs: execResult.timeMs,
        memoryUsedKb: execResult.memoryKb,
        output: (execResult.stdout + (execResult.stderr ? '\n--- stderr ---\n' + execResult.stderr : '')).substring(0, 4096),
      });

      if (verdict !== 'ACCEPTED' && overallVerdict === 'ACCEPTED') {
        overallVerdict = verdict;
        // Continue running remaining tests for full feedback
      }
    }

    // 5. Store results
    await prisma.$transaction([
      prisma.submission.update({
        where: { id: submissionId },
        data: {
          verdict: overallVerdict,
          executionTimeMs: maxTimeMs,
          memoryUsedKb: maxMemoryKb,
        },
      }),
      ...results.map((r) =>
        prisma.submissionResult.create({
          data: {
            submissionId,
            testCaseIndex: r.testCaseIndex,
            verdict: r.verdict,
            executionTimeMs: r.executionTimeMs,
            memoryUsedKb: r.memoryUsedKb,
            output: r.output,
          },
        }),
      ),
    ]);

    // 6. Update user-problem tracking
    if (overallVerdict === 'ACCEPTED') {
      const submission = await prisma.submission.findUnique({
        where: { id: submissionId },
        select: { userId: true },
      });

      if (submission) {
        await prisma.userProblem.upsert({
          where: {
            userId_problemId: {
              userId: submission.userId,
              problemId: problemId,
            },
          },
          update: {
            status: 'SOLVED',
            firstSolvedAt: new Date(),
          },
          create: {
            userId: submission.userId,
            problemId: problemId,
            status: 'SOLVED',
            firstSolvedAt: new Date(),
          },
        });
      }
    }

    console.log(`  ${overallVerdict === 'ACCEPTED' ? '✅' : '❌'} ${overallVerdict} (${maxTimeMs}ms)`);

    // 7. Cleanup temp files
    compile.cleanup?.(compileResult);

  } catch (err) {
    console.error(`❌ Internal error processing ${submissionId}:`, err);
    await prisma.submission.update({
      where: { id: submissionId },
      data: { verdict: 'INTERNAL_ERROR' },
    }).catch(() => {});
  }
}

async function processRun(job: RunJob) {
  const save = (data: Record<string, unknown>) =>
    redis.set(runResultKey(job.runId), JSON.stringify({ userId: job.userId, ...data }), 'EX', RUN_RESULT_TTL_SEC);

  console.log(`▶️  Run ${job.runId} (${job.languageSlug})`);
  let compileResult: CompileResult | null = null;
  try {
    await save({ status: 'RUNNING' });
    compileResult = await compile(job.sourceCode, job.languageSlug);
    if (!compileResult.success) {
      await save({ status: 'COMPILATION_ERROR', compileOutput: compileResult.error?.substring(0, 4096) ?? 'Compilation failed' });
      return;
    }

    const timeMultiplier = getLanguageById(job.languageSlug)?.timeMultiplier ?? 1;
    const limit = Math.round(job.timeLimitMs * timeMultiplier);
    const exec: ExecuteResult = await execute(
      compileResult.executablePath!,
      job.input,
      limit,
      job.memoryLimitMb,
      compileResult.interpreter,
    );

    await save({
      status: exec.timedOut ? 'TIME_LIMIT_EXCEEDED' : exec.exitCode !== 0 ? 'RUNTIME_ERROR' : 'OK',
      stdout: exec.stdout.substring(0, 16384),
      stderr: exec.stderr.substring(0, 4096),
      exitCode: exec.exitCode,
      timeMs: exec.timeMs,
      memoryKb: exec.memoryKb,
    });
  } catch (err) {
    console.error(`❌ Run ${job.runId} failed:`, err);
    await save({ status: 'INTERNAL_ERROR' }).catch(() => {});
  } finally {
    if (compileResult) compile.cleanup?.(compileResult);
  }
}

async function pollQueue() {
  while (running) {
    if (activeJobs >= MAX_CONCURRENT) {
      await sleep(100);
      continue;
    }

    try {
      // BRPOP with 1-second timeout. Run jobs are listed first: they are
      // interactive and cheap (single input), so they get priority.
      const result = await redis.brpop(RUN_QUEUE, SUBMISSION_QUEUE, 1);
      if (!result) continue;

      const [queue, rawJob] = result;
      const work = queue === RUN_QUEUE
        ? processRun(JSON.parse(rawJob) as RunJob)
        : processJob(JSON.parse(rawJob) as JudgeJob);

      activeJobs++;
      work
        .catch((err) => console.error('Job processing error:', err))
        .finally(() => { activeJobs--; });

    } catch (err) {
      if (running) {
        console.error('Queue poll error:', err);
        await sleep(POLL_INTERVAL_MS);
      }
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  console.log('🔧 Judge Worker starting...');

  await initDatabase();
  console.log('  ✅ Database connected');

  redis = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
  console.log('  ✅ Redis connected');

  const overhead = await calibrate();
  console.log(`  ⏱️ Process startup overhead calibrated: ${overhead}ms`);

  console.log('🚀 Judge Worker ready — polling for submissions');
  await pollQueue();
}

// Graceful shutdown
const shutdown = () => {
  console.log('\n⏹️ Shutting down judge worker...');
  running = false;
  setTimeout(() => process.exit(0), 2000);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

main().catch((err) => {
  console.error('Failed to start judge worker:', err);
  process.exit(1);
});
