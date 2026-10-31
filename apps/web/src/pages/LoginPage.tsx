import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { errorMessage } from '@/lib/format';
import { useDocumentTitle } from '@/lib/hooks';
import { AuthWindow } from '@/components/AuthWindow';
import { Alert, Button, Field, Input, toast } from '@/components/ui';

/** Only allow same-origin relative redirects. */
export function safeNext(next: string | null): string {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
}

export function LoginPage() {
  useDocumentTitle('Log in');
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ login: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(form.login.trim(), form.password);
      toast.ok('Welcome back', `Logged in as ${useAuthStore.getState().user?.handle ?? form.login}`);
      navigate(safeNext(params.get('next')), { replace: true });
    } catch (err) {
      setError(errorMessage(err, 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthWindow
      title="Log On to CodeArena"
      heading="Welcome back"
      subheading="Type your handle or email and password."
      footer={
        <>
          No account? <Link to={`/register${params.get('next') ? `?next=${encodeURIComponent(params.get('next')!)}` : ''}`}>Sign up</Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        {error && <Alert tone="bad">{error}</Alert>}
        <Field label="Handle or email" htmlFor="login-id">
          <Input
            id="login-id"
            autoComplete="username"
            autoFocus
            required
            value={form.login}
            onChange={(e) => setForm({ ...form, login: e.target.value })}
          />
        </Field>
        <Field label="Password" htmlFor="login-password">
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </Field>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Link to="/forgot-password" className="text-[14px]">Forgot password?</Link>
          <Button
            id="login-submit"
            type="submit"
            variant="primary"
            disabled={loading || !form.login || !form.password}
            leading={<LogIn size={15} />}
          >
            {loading ? 'Logging in…' : 'Log In'}
          </Button>
        </div>
      </form>
    </AuthWindow>
  );
}
