import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MailCheck, UserPlus } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { errorMessage } from '@/lib/format';
import { useDocumentTitle } from '@/lib/hooks';
import { AuthWindow } from '@/components/AuthWindow';
import { Alert, Button, Field, Input, LinkButton } from '@/components/ui';

const HANDLE_RE = /^[a-zA-Z0-9_]{3,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function RegisterPage() {
  useDocumentTitle('Sign up');
  const register = useAuthStore((s) => s.register);
  const [params] = useSearchParams();
  const [form, setForm] = useState({ handle: '', email: '', password: '', confirm: '' });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const errors = {
    handle: !HANDLE_RE.test(form.handle) ? '3–20 characters: letters, numbers, underscore' : null,
    email: !EMAIL_RE.test(form.email) ? 'Enter a valid email' : null,
    password: form.password.length < 8 ? 'At least 8 characters' : null,
    confirm: form.confirm !== form.password ? 'Passwords do not match' : null,
  };
  const valid = !Object.values(errors).some(Boolean);
  const show = (k: keyof typeof errors) => (touched[k] ? errors[k] : null);
  const bind = (k: keyof typeof form) => ({
    value: form[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value }),
    onBlur: () => setTouched((t) => ({ ...t, [k]: true })),
  });

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched({ handle: true, email: true, password: true, confirm: true });
    if (!valid) return;
    setError(null);
    setLoading(true);
    try {
      setDone(await register(form.handle.trim(), form.email.trim(), form.password));
    } catch (err) {
      setError(errorMessage(err, 'Registration failed'));
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <AuthWindow title="Setup Complete" heading="Account created" subheading={done}>
        <div className="flex flex-col gap-4">
          <Alert tone="ok">
            <span className="inline-flex items-center gap-2"><MailCheck size={16} /> Check your inbox for a verification link, then log in.</span>
          </Alert>
          <LinkButton to={`/login${params.get('next') ? `?next=${encodeURIComponent(params.get('next')!)}` : ''}`} variant="primary" block>
            Continue to log in
          </LinkButton>
        </div>
      </AuthWindow>
    );
  }

  return (
    <AuthWindow
      title="New User Setup"
      heading="Create your account"
      subheading="Your handle is public and appears in rankings."
      footer={<>Already registered? <Link to="/login">Log in</Link></>}
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        {error && <Alert tone="bad">{error}</Alert>}
        <Field label="Handle" htmlFor="reg-handle" error={show('handle')} hint="3–20 characters: letters, numbers, underscore">
          <Input id="reg-handle" autoComplete="username" autoFocus {...bind('handle')} />
        </Field>
        <Field label="Email" htmlFor="reg-email" error={show('email')}>
          <Input id="reg-email" type="email" autoComplete="email" {...bind('email')} />
        </Field>
        <Field label="Password" htmlFor="reg-password" error={show('password')} hint="At least 8 characters">
          <Input id="reg-password" type="password" autoComplete="new-password" {...bind('password')} />
        </Field>
        <Field label="Confirm password" htmlFor="reg-confirm" error={show('confirm')}>
          <Input id="reg-confirm" type="password" autoComplete="new-password" {...bind('confirm')} />
        </Field>
        <Button id="register-submit" type="submit" variant="primary" disabled={loading} leading={<UserPlus size={15} />} block>
          {loading ? 'Creating account…' : 'Sign Up'}
        </Button>
      </form>
    </AuthWindow>
  );
}
