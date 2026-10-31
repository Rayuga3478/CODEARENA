import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Mail, KeyRound } from 'lucide-react';
import { api } from '@/lib/api';
import { errorMessage } from '@/lib/format';
import { useDocumentTitle } from '@/lib/hooks';
import { AuthWindow } from '@/components/AuthWindow';
import { Alert, Button, Field, Input, LinkButton, ProgressBar } from '@/components/ui';

export function ForgotPasswordPage() {
  useDocumentTitle('Forgot password');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: email.trim() });
      setSent(true);
    } catch (err) {
      setError(errorMessage(err, 'Request failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthWindow
      title="Password Recovery"
      heading="Forgot your password?"
      subheading="We'll email you a link to set a new one."
      footer={<>Remembered it? <Link to="/login">Back to log in</Link></>}
    >
      {sent ? (
        <Alert tone="ok">If an account exists for <strong>{email}</strong>, a reset link is on its way. The link expires soon, so use it promptly.</Alert>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          {error && <Alert tone="bad">{error}</Alert>}
          <Field label="Email" htmlFor="forgot-email">
            <Input id="forgot-email" type="email" autoComplete="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Button type="submit" variant="primary" disabled={loading || !email} leading={<Mail size={15} />} block>
            {loading ? 'Sending…' : 'Send reset link'}
          </Button>
        </form>
      )}
    </AuthWindow>
  );
}

export function ResetPasswordPage() {
  useDocumentTitle('Reset password');
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const invalid = pw.length < 8 ? 'At least 8 characters' : confirm !== pw ? 'Passwords do not match' : null;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (invalid) return setError(invalid);
    setError(null);
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword: pw });
      setDone(true);
    } catch (err) {
      setError(errorMessage(err, 'Reset failed'));
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthWindow title="Reset Password" heading="Invalid link">
        <Alert tone="bad">This reset link is missing its token. Request a new one.</Alert>
        <div className="mt-4"><LinkButton to="/forgot-password" block>Request new link</LinkButton></div>
      </AuthWindow>
    );
  }

  return (
    <AuthWindow title="Reset Password" heading="Choose a new password">
      {done ? (
        <div className="flex flex-col gap-4">
          <Alert tone="ok">Password updated. You can now log in with your new password.</Alert>
          <LinkButton to="/login" variant="primary" block>Log in</LinkButton>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          {error && <Alert tone="bad">{error}</Alert>}
          <Field label="New password" htmlFor="reset-pw" hint="At least 8 characters">
            <Input id="reset-pw" type="password" autoComplete="new-password" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} />
          </Field>
          <Field label="Confirm password" htmlFor="reset-confirm">
            <Input id="reset-confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </Field>
          <Button type="submit" variant="primary" disabled={loading} leading={<KeyRound size={15} />} block>
            {loading ? 'Saving…' : 'Set new password'}
          </Button>
        </form>
      )}
    </AuthWindow>
  );
}

export function VerifyEmailPage() {
  useDocumentTitle('Verify email');
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [state, setState] = useState<'pending' | 'ok' | 'error'>(token ? 'pending' : 'error');
  const [message, setMessage] = useState(token ? '' : 'This verification link is missing its token.');
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    api
      .post<{ message: string }>('/auth/verify-email', { token })
      .then((r) => {
        setState('ok');
        setMessage(r.message);
      })
      .catch((err) => {
        setState('error');
        setMessage(errorMessage(err, 'Verification failed'));
      });
  }, [token]);

  return (
    <AuthWindow title="Email Verification" heading={state === 'pending' ? 'Verifying…' : state === 'ok' ? 'Email verified' : 'Verification failed'}>
      {state === 'pending' && <ProgressBar label="Verifying" />}
      {state === 'ok' && (
        <div className="flex flex-col gap-4">
          <Alert tone="ok">{message}</Alert>
          <LinkButton to="/login" variant="primary" block>Log in</LinkButton>
        </div>
      )}
      {state === 'error' && <Alert tone="bad">{message}</Alert>}
    </AuthWindow>
  );
}
