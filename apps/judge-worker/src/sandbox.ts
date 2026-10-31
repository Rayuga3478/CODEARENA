/**
 * Sandbox — Compiles and executes submissions (C++17, Python 3).
 *
 * Uses child_process with strict timeouts.
 * Creates temp directories for each submission to isolate file operations.
 *
 * When Docker is available, this module can be swapped for container-based execution.
 */

import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { tmpdir } from 'os';
import { dirname, delimiter } from 'path';

// Configurable compiler path — set via env or auto-detect
const GPP_PATH = process.env['GPP_PATH'] ?? 'g++';

// MSYS2/MinGW g++ needs its own bin directory on PATH to locate cc1plus and runtime DLLs
const COMPILER_DIR = GPP_PATH.includes('/') || GPP_PATH.includes('\\') ? dirname(GPP_PATH) : '';
const CHILD_ENV: NodeJS.ProcessEnv = {
  ...process.env,
  PATH: COMPILER_DIR ? `${COMPILER_DIR}${delimiter}${process.env['PATH'] ?? ''}` : process.env['PATH'],
};
const COMPILE_TIMEOUT_MS = 15000; // 15 seconds for compilation

// Interpreter paths for non-compiled languages — set via env or fall back to PATH lookup
const PYTHON_PATH = process.env['PYTHON_PATH'] ?? 'python';

export interface CompileResult {
  success: boolean;
  /** Path of the file to run: the built executable, or the source script for interpreted languages */
  executablePath?: string;
  /** Interpreter that runs executablePath. Undefined for native executables. */
  interpreter?: string;
  workDir?: string;
  error?: string;
}

export interface ExecuteResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timeMs: number;
  memoryKb: number;
  timedOut: boolean;
}

/**
 * Compile C++ source code to an executable.
 */
export async function compile(
  sourceCode: string,
  languageSlug: string,
): Promise<CompileResult> {
  const workDir = join(tmpdir(), `judge-${randomUUID()}`);
  await fs.mkdir(workDir, { recursive: true });

  try {
    if (languageSlug === 'cpp17') {
      const sourcePath = join(workDir, 'solution.cpp');
      const execPath = join(workDir, 'solution.exe');

      await fs.writeFile(sourcePath, sourceCode, 'utf-8');

      // Compile with g++ -std=c++17 -O2
      const result = await runProcess(
        GPP_PATH,
        ['-std=c++17', '-O2', '-o', execPath, sourcePath],
        {
          cwd: workDir,
          timeoutMs: COMPILE_TIMEOUT_MS,
        },
      );

      if (result.exitCode !== 0) {
        return {
          success: false,
          workDir,
          error: result.stderr || result.stdout || `Compilation failed (exit code ${result.exitCode}${result.timedOut ? ', timed out' : ''})`,
        };
      }

      return {
        success: true,
        executablePath: execPath,
        workDir,
      };
    }

    if (languageSlug === 'python3') {
      const sourcePath = join(workDir, 'solution.py');
      await fs.writeFile(sourcePath, sourceCode, 'utf-8');

      // Syntax check only (no execution) so syntax errors report as COMPILATION_ERROR
      const result = await runProcess(
        PYTHON_PATH,
        ['-m', 'py_compile', sourcePath],
        {
          cwd: workDir,
          timeoutMs: COMPILE_TIMEOUT_MS,
        },
      );

      if (result.exitCode !== 0) {
        return {
          success: false,
          workDir,
          error: result.stderr || result.stdout || `Syntax check failed (exit code ${result.exitCode})`,
        };
      }

      return {
        success: true,
        executablePath: sourcePath,
        interpreter: PYTHON_PATH,
        workDir,
      };
    }

    return {
      success: false,
      workDir,
      error: `Unsupported language: ${languageSlug}`,
    };
  } catch (err) {
    return {
      success: false,
      workDir,
      error: err instanceof Error ? err.message : 'Compilation failed',
    };
  }
}

// Attach cleanup function
compile.cleanup = (result: CompileResult) => {
  if (result.workDir) {
    fs.rm(result.workDir, { recursive: true, force: true }).catch(() => {});
  }
};

// Startup overhead of launching a freshly built executable (e.g. antivirus scan on Windows).
// Measured once at worker start so it doesn't count against the user's time limit.
let startupOverheadMs = 0;

/**
 * Measure process launch overhead by compiling and running an empty program a few times.
 */
export async function calibrate(samples = 3): Promise<number> {
  const measured: number[] = [];
  for (let i = 0; i < samples; i++) {
    const c = await compile('int main(){return 0;}', 'cpp17');
    if (!c.success || !c.executablePath) {
      compile.cleanup(c);
      continue;
    }
    const start = performance.now();
    await runProcess(c.executablePath, [], { cwd: c.workDir, timeoutMs: 10000, input: '' });
    measured.push(performance.now() - start);
    compile.cleanup(c);
  }
  if (measured.length === 0) return 0;
  measured.sort((a, b) => a - b);
  // Median, rounded
  startupOverheadMs = Math.round(measured[Math.floor(measured.length / 2)]!);
  return startupOverheadMs;
}

/**
 * Execute a compiled program with the given input.
 */
export async function execute(
  executablePath: string,
  input: string,
  timeLimitMs: number,
  memoryLimitMb: number,
  interpreter?: string,
): Promise<ExecuteResult> {
  const startTime = performance.now();

  // The launch overhead (antivirus scan) only applies to freshly built executables,
  // not to an already-scanned interpreter running a script.
  const overheadMs = interpreter ? 0 : startupOverheadMs;

  const result = await runProcess(
    interpreter ?? executablePath,
    interpreter ? ['-u', executablePath] : [],
    {
      cwd: join(executablePath, '..'),
      // Hard kill after limit + startup overhead + small grace period
      timeoutMs: timeLimitMs + overheadMs + 500,
      input,
    },
  );

  const wallMs = Math.round(performance.now() - startTime);
  const timeMs = Math.max(0, wallMs - overheadMs);

  return {
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.exitCode,
    timeMs: Math.min(timeMs, timeLimitMs),
    memoryKb: result.memoryKb ?? 0,
    timedOut: result.timedOut || timeMs > timeLimitMs,
  };
}

interface RunProcessOptions {
  cwd?: string;
  timeoutMs: number;
  input?: string;
}

interface RunProcessResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
  memoryKb?: number;
}

function runProcess(
  command: string,
  args: string[],
  options: RunProcessOptions,
): Promise<RunProcessResult> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: CHILD_ENV,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const maxOutputSize = 1024 * 1024; // 1MB max output

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, options.timeoutMs);

    child.stdout.on('data', (data: Buffer) => {
      if (stdout.length < maxOutputSize) {
        stdout += data.toString();
      }
    });

    child.stderr.on('data', (data: Buffer) => {
      if (stderr.length < maxOutputSize) {
        stderr += data.toString();
      }
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({
        stdout,
        stderr,
        exitCode: code ?? 1,
        timedOut,
      });
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({
        stdout,
        stderr: err.message,
        exitCode: 1,
        timedOut: false,
      });
    });

    // Send input
    if (options.input) {
      child.stdin.write(options.input);
      child.stdin.end();
    } else {
      child.stdin.end();
    }
  });
}
