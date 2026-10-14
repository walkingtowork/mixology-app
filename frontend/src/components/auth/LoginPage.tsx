import { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import Button from '../ui/Button';
import FormField from '../ui/FormField';
import LoadingSpinner from '../ui/LoadingSpinner';
import './LoginPage.css';

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const location = useLocation();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) return <LoadingSpinner />;
  if (user) {
    // Back to the page that sent them here, if a guard did.
    const from = (location.state as { from?: { pathname: string; search: string } } | null)?.from;
    return <Navigate to={from ? `${from.pathname}${from.search}` : '/'} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(identifier.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in.');
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-form" onSubmit={handleSubmit}>
        {/* The same glass and greeting as the home page: this is its front door. */}
        <div className="login-glass" aria-hidden="true">
          <div className="martini-glass">
            <div className="glass" />
            <div className="glass-left-edge" />
            <div className="glass-right-edge" />
            <div className="stem" />
            <div className="base" />
          </div>
        </div>
        <h1 className="login-title">What are we making tonight?</h1>
        <p className="login-subtitle">Sign in to The Bar Cart</p>
        <FormField label="Email or username" htmlFor="login-identifier">
          <input
            id="login-identifier"
            type="text"
            value={identifier}
            onChange={e => setIdentifier(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoFocus
          />
        </FormField>
        <FormField label="Password" htmlFor="login-password">
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </FormField>
        {error && <p className="login-error" role="alert">{error}</p>}
        <Button type="submit" variant="primary" disabled={submitting || !identifier.trim() || !password}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </div>
  );
}
