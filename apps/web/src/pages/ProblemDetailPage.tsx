import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { OnMount } from '@monaco-editor/react';
import { ArrowLeft, Check, Clock, Copy, Cpu, HardDrive, Play, RotateCcw, Send, X } from 'lucide-react';
import { api } from '@/lib/api';
import type { ContestDetail, ProblemDetail, RunResult, SubmissionDetail } from '@/lib/types';
import { errorMessage, formatMemory, getVerdict, isPendingVerdict } from '@/lib/format';
import { useDocumentTitle, useHotkey, useMediaQuery } from '@/lib/hooks';
import { useAuthStore } from '@/stores/auth';
import { CodeEditor, DEFAULT_LANGUAGE, LANGUAGE_OPTIONS } from '@/components/CodeEditor';
import {
  Alert,
  Badge,
  Button,
  DifficultyBadge,
  LinkButton,
  Loading,
  ProgressBar,
  Select,
  StatusCell,
  Tag,
  Textarea,
  VerdictBadge,
  Window,
  toast,
} from '@/components/ui';

type ConsoleTab = 'testcase' | 'run' | 'submission';
type MobileTab = 'problem' | 'code' | 'result';

const LANG_KEY = 'cp-lang';
const codeKey = (slug: string, lang: string) => `cp-code:${slug}:${lang}`;
const RUN_PENDING = new Set(['QUEUED', 'RUNNING']);

const normalize = (s: string) =>
  s
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => l.trimEnd())
    .join('\n')
    .trim();

export function ProblemDetailPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const [params] = useSearchParams();
  const contestId = params.get('contest');
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  const problemQ = useQuery({
    queryKey: ['problem', slug],
    queryFn: () => api.get<{ problem: ProblemDetail }>(`/problems/${slug}`),
  });
  const contestQ = useQuery({
    queryKey: ['contest', contestId],
    enabled: !!contestId,
    queryFn: () => api.get<{ contest: ContestDetail }>(`/contests/${contestId}`),
  });
  const problem = problemQ.data?.problem;
  const contest = contestQ.data?.contest;
  const contestLabel = contest?.problems.find((p) => p.problem.slug === slug)?.label;
  useDocumentTitle(problem ? `${contestLabel ? `${contestLabel}. ` : ''}${problem.title}` : 'Problem');

  // ── Editor state (persisted per problem + language) ──────────────────
  const [langId, setLangId] = useState(() => {
    const saved = localStorage.getItem(LANG_KEY);
    return LANGUAGE_OPTIONS.find((l) => l.id === saved && l.enabled)?.id ?? DEFAULT_LANGUAGE.id;
  });
  const lang = LANGUAGE_OPTIONS.find((l) => l.id === langId) ?? DEFAULT_LANGUAGE;
  const [code, setCode] = useState(() => localStorage.getItem(codeKey(slug, langId)) ?? lang.defaultCode);

  useEffect(() => {
    setCode(localStorage.getItem(codeKey(slug, langId)) ?? lang.defaultCode);
    localStorage.setItem(LANG_KEY, langId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, langId]);

  useEffect(() => {
    const id = setTimeout(() => {
      if (code === lang.defaultCode) localStorage.removeItem(codeKey(slug, langId));
      else localStorage.setItem(codeKey(slug, langId), code);
    }, 400);
    return () => clearTimeout(id);
  }, [code, slug, langId, lang.defaultCode]);

  // ── Console state ─────────────────────────────────────────────────────
  const [consoleTab, setConsoleTab] = useState<ConsoleTab>('testcase');
  const [mobileTab, setMobileTab] = useState<MobileTab>('problem');
  const [input, setInput] = useState('');
  const [run, setRun] = useState<RunResult | null>(null);
  const [runInput, setRunInput] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  // Default custom input to the first sample
  useEffect(() => {
    if (problem?.testCases[0]) setInput(problem.testCases[0].input);
  }, [problem?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const showResults = (tab: ConsoleTab) => {
    setConsoleTab(tab);
    if (!isDesktop) setMobileTab('result');
  };

  const requireAuth = () => {
    if (isAuthenticated) return true;
    toast.info('Log in to run code', 'Running and submitting require an account.');
    navigate(`/login?next=${encodeURIComponent(`/problems/${slug}${contestId ? `?contest=${contestId}` : ''}`)}`);
    return false;
  };

  const handleRun = useCallback(async () => {
    if (running || submitting || !requireAuth()) return;
    if (!lang.enabled) return;
    setRunning(true);
    setActionError(null);
    setRun({ status: 'QUEUED' });
    setRunInput(input);
    showResults('run');
    try {
      const { runId } = await api.post<{ runId: string }>('/submissions/run', {
        problemSlug: slug,
        languageId: lang.id,
        sourceCode: code,
        input,
      });
      for (let i = 0; i < 90 && alive.current; i++) {
        await new Promise((r) => setTimeout(r, i < 5 ? 700 : 1200));
        const { run: r } = await api.get<{ run: RunResult }>(`/submissions/run/${runId}`);
        if (!alive.current) return;
        setRun(r);
        if (!RUN_PENDING.has(r.status)) break;
      }
    } catch (err) {
      setRun(null);
      setActionError(errorMessage(err, 'Run failed'));
    } finally {
      if (alive.current) setRunning(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, submitting, lang, slug, code, input, isAuthenticated, isDesktop]);

  const handleSubmit = useCallback(async () => {
    if (running || submitting || !requireAuth()) return;
    if (!lang.enabled) return;
    if (!code.trim()) {
      toast.warn('Nothing to submit', 'Write some code first.');
      return;
    }
    setSubmitting(true);
    setActionError(null);
    setSubmission(null);
    showResults('submission');
    try {
      const { submission: created } = await api.post<{ submission: { id: string; verdict: string } }>('/submissions', {
        problemSlug: slug,
        languageId: lang.id,
        sourceCode: code,
        ...(contestId ? { contestId } : {}),
      });
      setSubmission({ id: created.id, verdict: created.verdict, executionTimeMs: null, memoryUsedKb: null, compilationOutput: null, createdAt: new Date().toISOString() });
      for (let i = 0; i < 120 && alive.current; i++) {
        await new Promise((r) => setTimeout(r, 1500));
        const { submission: s } = await api.get<{ submission: SubmissionDetail }>(`/submissions/${created.id}`);
        if (!alive.current) return;
        setSubmission(s);
        if (!isPendingVerdict(s.verdict)) {
          const v = getVerdict(s.verdict);
          if (s.verdict === 'ACCEPTED') toast.ok('Accepted', `${problem?.title ?? slug} — all tests passed.`);
          else toast.bad(v.label, s.results?.length ? `Failed on test ${failedTest(s) ?? '?'}` : undefined);
          qc.invalidateQueries({ queryKey: ['problems'] });
          qc.invalidateQueries({ queryKey: ['standings'] });
          qc.invalidateQueries({ queryKey: ['submissions'] });
          break;
        }
      }
    } catch (err) {
      setActionError(errorMessage(err, 'Submission failed'));
    } finally {
      if (alive.current) setSubmitting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, submitting, lang, slug, code, contestId, isAuthenticated, isDesktop, problem?.title]);

  // Keyboard shortcuts (outside Monaco); Monaco registers its own commands below.
  const runRef = useRef(handleRun);
  const submitRef = useRef(handleSubmit);
  runRef.current = handleRun;
  submitRef.current = handleSubmit;
  useHotkey((e) => (e.ctrlKey || e.metaKey) && e.key === 'Enter', (e) => { e.preventDefault(); submitRef.current(); }, true);
  useHotkey((e) => (e.ctrlKey || e.metaKey) && e.key === "'", (e) => { e.preventDefault(); runRef.current(); }, true);

  const onEditorMount: OnMount = (editor, monaco) => {
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => submitRef.current());
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Quote, () => runRef.current());
  };

  const resetCode = () => {
    if (code !== lang.defaultCode && !window.confirm('Reset the editor to the starter template? Your code for this language will be lost.')) return;
    setCode(lang.defaultCode);
  };

  if (problemQ.isLoading) return <Loading label="Opening problem…" />;
  if (problemQ.isError || !problem) {
    return (
      <div className="container-os">
        <Window title="Error" tone="bad" className="max-w-lg mx-auto">
          <Alert tone="bad">{errorMessage(problemQ.error, 'Problem not found')}</Alert>
          <div className="mt-4">
            <LinkButton to="/problems" leading={<ArrowLeft size={14} />}>Back to problems</LinkButton>
          </div>
        </Window>
      </div>
    );
  }

  const busy = running || submitting;
  const contestBlocked = !!contest && contest.status !== 'RUNNING';

  // ── Panels ────────────────────────────────────────────────────────────
  const statementPanel = (
    <Window
      title={`${contestLabel ? `${contestLabel}. ` : ''}${problem.title}`}
      icon={<span className="t-mono text-[11px]">TXT</span>}
      controls={false}
      className="ws-pane"
      bodyClassName="ws-scroll"
      statusbar={
        <>
          <StatusCell>
            <span className="inline-flex items-center gap-1"><Clock size={12} /> {problem.timeLimitMs} ms</span>
          </StatusCell>
          <StatusCell fit>
            <span className="inline-flex items-center gap-1"><HardDrive size={12} /> {problem.memoryLimitMb} MB</span>
          </StatusCell>
          <StatusCell fit>{problem.submissionCount} submissions</StatusCell>
        </>
      }
    >
      <ProblemStatement problem={problem} contest={contest} contestLabel={contestLabel} />
    </Window>
  );

  const editorPanel = (
    <Window
      title={`solution.${lang.monacoLang === 'cpp' ? 'cpp' : lang.monacoLang === 'python' ? 'py' : lang.monacoLang === 'java' ? 'java' : 'js'}`}
      icon={<Cpu size={14} />}
      controls={false}
      className="ws-pane ws-editor"
      flush
      menubar={
        <div className="flex flex-wrap items-center gap-2 w-full p-1">
          <Select aria-label="Language" value={langId} onChange={(e) => setLangId(e.target.value)} className="min-w-[150px]">
            {LANGUAGE_OPTIONS.map((l) => (
              <option key={l.id} value={l.id} disabled={!l.enabled}>
                {l.label}{l.enabled ? '' : ' — coming soon'}
              </option>
            ))}
          </Select>
          <Button size="sm" onClick={resetCode} leading={<RotateCcw size={13} />} title="Reset to template">
            <span className="hidden sm:inline">Reset</span>
          </Button>
          <div className="flex-1" />
          <div className="hidden lg:flex items-center gap-2">
            <Button size="sm" onClick={handleRun} disabled={busy || contestBlocked} leading={<Play size={13} />} title="Run (Ctrl+')">
              {running ? 'Running…' : 'Run'}
            </Button>
            <Button size="sm" variant="primary" onClick={handleSubmit} disabled={busy || contestBlocked} leading={<Send size={13} />} title="Submit (Ctrl+Enter)">
              {submitting ? 'Judging…' : 'Submit'}
            </Button>
          </div>
        </div>
      }
      statusbar={
        <>
          <StatusCell>{contestBlocked ? 'Contest is not running — submissions closed' : `${lang.label} · ${code.split('\n').length} lines`}</StatusCell>
          <StatusCell fit><span className="hidden md:inline">Ctrl+' run · Ctrl+Enter submit</span><span className="md:hidden">Autosaved</span></StatusCell>
        </>
      }
    >
      <div className="ws-editor__body">
        <CodeEditor value={code} onChange={setCode} language={lang.monacoLang} onMount={onEditorMount} fontSize={isDesktop ? 14 : 13} />
      </div>
    </Window>
  );

  const consolePanel = (
    <Window title="Console" icon={<span className="t-mono text-[11px]">&gt;_</span>} controls={false} className="ws-pane ws-console" flush>
      <div className="os-tabs px-2 pt-2" role="tablist">
        {(
          [
            ['testcase', 'Testcase'],
            ['run', 'Run Result'],
            ['submission', 'Submission'],
          ] as const
        ).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={consoleTab === id} className="os-tab" onClick={() => setConsoleTab(id)}>
            {label}
            {id === 'run' && running && <span className="os-hourglass ml-1" style={{ width: 8, height: 11 }} />}
            {id === 'submission' && submitting && <span className="os-hourglass ml-1" style={{ width: 8, height: 11 }} />}
          </button>
        ))}
      </div>
      <div className="os-tabpanel mx-2 mb-2 ws-scroll" style={{ minHeight: 0, flex: 1 }}>
        {actionError && <Alert tone="bad" className="mb-3">{actionError}</Alert>}
        {consoleTab === 'testcase' && (
          <TestcasePanel problem={problem} input={input} setInput={setInput} />
        )}
        {consoleTab === 'run' && <RunPanel run={run} runInput={runInput} problem={problem} />}
        {consoleTab === 'submission' && <SubmissionPanel submission={submission} submitting={submitting} />}
      </div>
    </Window>
  );

  // ── Desktop: two panes ───────────────────────────────────────────────
  if (isDesktop) {
    return (
      <div className="ws">
        <div className="ws-left">{statementPanel}</div>
        <div className="ws-right">
          {editorPanel}
          {consolePanel}
        </div>
      </div>
    );
  }

  // ── Mobile / tablet: tabs + bottom action bar ─────────────────────────
  return (
    <div className="ws-mobile">
      <div className="os-seg w-full mb-3" role="tablist" aria-label="Workspace">
        {(
          [
            ['problem', 'Problem'],
            ['code', 'Code'],
            ['result', 'Result'],
          ] as const
        ).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={mobileTab === id} aria-pressed={mobileTab === id} className="os-btn flex-1" onClick={() => setMobileTab(id)}>
            {label}
            {id === 'result' && busy && <span className="os-hourglass ml-1" style={{ width: 8, height: 11 }} />}
          </button>
        ))}
      </div>
      <div className={mobileTab === 'problem' ? '' : 'hidden'}>{statementPanel}</div>
      <div className={mobileTab === 'code' ? 'ws-mobile__editor' : 'hidden'}>{editorPanel}</div>
      <div className={mobileTab === 'result' ? 'ws-mobile__console' : 'hidden'}>{consolePanel}</div>

      <div className="ws-actionbar">
        <Button onClick={handleRun} disabled={busy || contestBlocked} leading={<Play size={15} />} block>
          {running ? 'Running…' : 'Run'}
        </Button>
        <Button variant="primary" onClick={handleSubmit} disabled={busy || contestBlocked} leading={<Send size={15} />} block>
          {submitting ? 'Judging…' : 'Submit'}
        </Button>
      </div>
    </div>
  );
}

function failedTest(s: SubmissionDetail): number | null {
  const r = s.results?.find((x) => x.verdict !== 'ACCEPTED');
  return r ? r.testCaseIndex + 1 : null;
}

// ─── Statement ───────────────────────────────────────────────────────────

/** Renders `code` and $math$ spans inline as monospace. */
function Inline({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`|\$[^$\n]+\$)/g);
  return (
    <>
      {parts.map((p, i) =>
        (p.startsWith('`') && p.endsWith('`')) || (p.startsWith('$') && p.endsWith('$') && p.length > 2) ? (
          <code key={i}>{p.slice(1, -1)}</code>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

function StatementSection({ title, text }: { title: string; text?: string | null }) {
  if (!text?.trim()) return null;
  return (
    <section className="mb-6">
      <h2 className="os-section-title">{title}</h2>
      <div className="os-prose">
        <Inline text={text.trim()} />
      </div>
    </section>
  );
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="os-btn os-btn--sm os-btn--ghost"
      aria-label={label}
      title={label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1200);
        } catch {
          toast.warn('Clipboard unavailable');
        }
      }}
    >
      {done ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}

function ProblemStatement({ problem, contest, contestLabel }: { problem: ProblemDetail; contest?: ContestDetail; contestLabel?: string }) {
  return (
    <article className="p-1 sm:p-2">
      {contest && (
        <Link to={`/contests/${contest.id}`} className="inline-flex items-center gap-1 text-[13px] mb-3">
          <ArrowLeft size={13} /> {contest.title}
          {contestLabel && <span className="t-muted"> · Problem {contestLabel}</span>}
        </Link>
      )}
      <h1 className="t-display text-[clamp(28px,3.4vw,40px)] m-0 mb-3 normal-case" style={{ textTransform: 'none' }}>
        {problem.title}
      </h1>
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <DifficultyBadge rating={problem.difficulty} />
        <Badge flat>{problem.points} pts</Badge>
        {problem.tags.map((t) => (
          <Link key={t.id} to={`/problems?tags=${encodeURIComponent(t.name)}`} className="no-underline hover:no-underline">
            <Tag tag={t} />
          </Link>
        ))}
      </div>

      <StatementSection title="Statement" text={problem.statement} />
      <StatementSection title="Input" text={problem.inputFormat} />
      <StatementSection title="Output" text={problem.outputFormat} />
      <StatementSection title="Constraints" text={problem.constraints} />

      {problem.testCases.length > 0 && (
        <section className="mb-4">
          <h2 className="os-section-title">Examples</h2>
          <div className="flex flex-col gap-4">
            {problem.testCases.map((tc, i) => (
              <div key={tc.id} className="flex flex-col gap-2">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="t-ui text-[13px] t-secondary">Input #{i + 1}</span>
                      <CopyButton text={tc.input} label={`Copy input ${i + 1}`} />
                    </div>
                    <pre className="os-pre">{tc.input}</pre>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="t-ui text-[13px] t-secondary">Output #{i + 1}</span>
                      <CopyButton text={tc.expectedOutput} label={`Copy output ${i + 1}`} />
                    </div>
                    <pre className="os-pre">{tc.expectedOutput}</pre>
                  </div>
                </div>
                {tc.explanation && (
                  <p className="m-0 text-[14px] t-secondary">
                    <strong>Explanation: </strong>
                    <Inline text={tc.explanation} />
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
      <p className="text-[12px] t-muted mt-6 mb-0">
        Author: <Link to={`/user/${problem.author.handle}`}>{problem.author.handle}</Link> ·{' '}
        <Link to={`/submissions?problemSlug=${problem.slug}`}>All submissions</Link>
      </p>
    </article>
  );
}

// ─── Console panels ──────────────────────────────────────────────────────

function TestcasePanel({ problem, input, setInput }: { problem: ProblemDetail; input: string; setInput: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-2 h-full">
      {problem.testCases.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="t-ui text-[12px] t-muted mr-1">Load sample:</span>
          {problem.testCases.map((tc, i) => (
            <Button key={tc.id} size="sm" pressed={normalize(input) === normalize(tc.input)} onClick={() => setInput(tc.input)}>
              #{i + 1}
            </Button>
          ))}
        </div>
      )}
      <label className="os-label" htmlFor="custom-input">Custom input (stdin)</label>
      <Textarea
        id="custom-input"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        spellCheck={false}
        className="t-mono flex-1 min-h-[96px]"
        placeholder="Type input for Run…"
      />
    </div>
  );
}

function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="t-ui text-[12px] t-muted">{label}</span>
      {children}
    </div>
  );
}

function RunPanel({ run, runInput, problem }: { run: RunResult | null; runInput: string | null; problem: ProblemDetail }) {
  if (!run) return <p className="m-0 t-muted text-[14px]">Press <kbd>Run</kbd> to execute your code on the custom input.</p>;
  if (RUN_PENDING.has(run.status)) {
    return (
      <div className="flex flex-col gap-2 py-2">
        <ProgressBar label="Running" />
        <span className="t-ui text-[13px] t-secondary">{run.status === 'QUEUED' ? 'Waiting for a judge…' : 'Running your code…'}</span>
      </div>
    );
  }
  const sample = runInput !== null ? problem.testCases.find((tc) => normalize(tc.input) === normalize(runInput)) : undefined;
  const matches = sample && run.status === 'OK' ? normalize(run.stdout ?? '') === normalize(sample.expectedOutput) : null;
  const statusTone = run.status === 'OK' ? (matches === false ? 'bad' : 'ok') : run.status === 'TIME_LIMIT_EXCEEDED' ? 'warn' : 'bad';
  const statusLabel =
    run.status === 'OK'
      ? matches === true
        ? 'Sample passed'
        : matches === false
          ? 'Output differs from expected'
          : 'Finished'
      : getVerdict(run.status).label;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={statusTone}>{matches === true ? <Check size={12} /> : matches === false ? <X size={12} /> : null}{statusLabel}</Badge>
        {run.timeMs !== undefined && <span className="t-mono text-[13px] t-muted">{run.timeMs} ms</span>}
        {run.exitCode !== undefined && run.exitCode !== 0 && <span className="t-mono text-[13px] t-muted">exit {run.exitCode}</span>}
      </div>
      {run.compileOutput && (
        <Labeled label="Compiler output">
          <pre className="os-pre" style={{ color: 'var(--bad)' }}>{run.compileOutput}</pre>
        </Labeled>
      )}
      {run.status !== 'COMPILATION_ERROR' && (
        <div className={`grid gap-3 ${sample ? 'md:grid-cols-2' : ''}`}>
          <Labeled label="Your output (stdout)">
            <pre className="os-pre">{run.stdout || <span className="t-muted">(empty)</span>}</pre>
          </Labeled>
          {sample && (
            <Labeled label="Expected output">
              <pre className="os-pre">{sample.expectedOutput}</pre>
            </Labeled>
          )}
        </div>
      )}
      {run.stderr && (
        <Labeled label="stderr">
          <pre className="os-pre" style={{ color: 'var(--warn)' }}>{run.stderr}</pre>
        </Labeled>
      )}
    </div>
  );
}

function SubmissionPanel({ submission, submitting }: { submission: SubmissionDetail | null; submitting: boolean }) {
  if (!submission) {
    return submitting ? (
      <div className="py-2"><ProgressBar label="Submitting" /></div>
    ) : (
      <p className="m-0 t-muted text-[14px]">Press <kbd>Submit</kbd> to judge your code against all tests.</p>
    );
  }
  const pending = isPendingVerdict(submission.verdict);
  const results = submission.results ?? [];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[20px]"><VerdictBadge verdict={submission.verdict} /></span>
        {!pending && submission.executionTimeMs !== null && (
          <span className="t-mono text-[13px] t-muted inline-flex items-center gap-1"><Clock size={12} />{submission.executionTimeMs} ms</span>
        )}
        {!pending && submission.memoryUsedKb !== null && (
          <span className="t-mono text-[13px] t-muted inline-flex items-center gap-1"><HardDrive size={12} />{formatMemory(submission.memoryUsedKb)}</span>
        )}
        <span className="t-mono text-[12px] t-muted ml-auto">#{submission.id.slice(0, 8)}</span>
      </div>
      {pending && <ProgressBar label="Judging" />}
      {submission.compilationOutput && (
        <Labeled label="Compiler output">
          <pre className="os-pre" style={{ color: 'var(--bad)' }}>{submission.compilationOutput}</pre>
        </Labeled>
      )}
      {results.length > 0 && (
        <Labeled label={`Tests (${results.filter((r) => r.verdict === 'ACCEPTED').length}/${results.length} passed)`}>
          <ul className="list-none m-0 p-0 grid gap-1.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(118px, 1fr))' }}>
            {results.map((r) => {
              const v = getVerdict(r.verdict);
              return (
                <li key={r.id} className={`os-badge os-badge--${v.tone} justify-between`} title={v.label}>
                  <span className="t-mono">#{r.testCaseIndex + 1}</span>
                  <span>{v.short}</span>
                  {r.executionTimeMs !== null && <span className="t-mono opacity-75">{r.executionTimeMs}ms</span>}
                </li>
              );
            })}
          </ul>
        </Labeled>
      )}
    </div>
  );
}
