import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { checkInvite } from '../../services/cocktailsApi';
import Button from '../ui/Button';
import FormField from '../ui/FormField';
import LoadingSpinner from '../ui/LoadingSpinner';
import './LoginPage.css';

const USERNAME_PATTERN = /^[A-Za-z0-9]+$/;

/** Where an invite link lands: check the invite, then create an account with it. */
export default function SignupPage() {
  const { token = '' } = useParams<{ token: string }>();
  const { user, loading, logout, signup } = useAuth();
  const [invite, setInvite] = useState<'checking' | 'ok' | string>('checking');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkInvite(token)
      .then(() => setInvite('ok'))
      .catch(err => setInvite(err instanceof Error ? err.message : 'This invite link isn\'t valid.'));
  }, [token]);

  if (joined) return <Navigate to="/" replace />;
  if (loading || invite === 'checking') return <LoadingSpinner />;

  const header = (
    <>
      <div className="login-glass" aria-hidden="true">
        <div className="martini-glass">
          <div className="glass" />
          <div className="glass-left-edge" />
          <div className="glass-right-edge" />
          <div className="stem" />
          <div className="base" />
        </div>
      </div>
      <h1 className="login-title">Welcome to The Bar Cart</h1>
    </>
  );

  // Signing up here would replace the current session, and use up the invite for nothing.
  if (user) {
    return (
      <div className="login-page">
        <div className="login-form">
          {header}
          <p className="login-subtitle">
            You're signed in as <strong>{user.username}</strong>. Log out to use this invite.
          </p>
          <Button variant="primary" onClick={logout}>Log out</Button>
        </div>
      </div>
    );
  }

  if (invite !== 'ok') {
    return (
      <div className="login-page">
        <div className="login-form">
          {header}
          <p className="login-error login-error-centered" role="alert">{invite}</p>
          <p className="login-subtitle">Ask whoever invited you for a new link.</p>
        </div>
      </div>
    );
  }

  const usernameProblem = username && !USERNAME_PATTERN.test(username)
    ? 'Letters and numbers only.' : undefined;
  const confirmProblem = confirm && confirm !== password ? "The passwords don't match." : undefined;
  const ready = username && email.trim() && password && confirm === password && !usernameProblem;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    setSubmitting(true);
    setError(null);
    try {
      await signup(token, { username, email: email.trim(), password });
      setJoined(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create your account.');
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-form" onSubmit={handleSubmit}>
        {header}
        <p className="login-subtitle">You've been invited. Create your account.</p>
        <FormField label="Username" htmlFor="signup-username" error={usernameProblem}>
          <input
            id="signup-username"
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoFocus
          />
        </FormField>
        <FormField label="Email" htmlFor="signup-email">
          <input
            id="signup-email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
          />
        </FormField>
        <FormField label="Password" htmlFor="signup-password">
          <div className="password-input">
            <input
              id="signup-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(s => !s)}
              aria-pressed={showPassword}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </FormField>
        <FormField label="Confirm password" htmlFor="signup-confirm" error={confirmProblem}>
          <input
            id="signup-confirm"
            type={showPassword ? 'text' : 'password'}
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
        </FormField>
        {error && <p className="login-error" role="alert">{error}</p>}
        <Button type="submit" variant="primary" disabled={submitting || !ready}>
          {submitting ? 'Creating your account…' : 'Create account'}
        </Button>
      </form>
    </div>
  );
}
