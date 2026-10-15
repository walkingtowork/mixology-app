import { useState } from 'react';
import { Link } from 'react-router-dom';
import { requestPasswordReset } from '../../services/cocktailsApi';
import Button from '../ui/Button';
import FormField from '../ui/FormField';
import AuthHeader from './AuthHeader';
import './LoginPage.css';

/** Ask for a password reset link, by email or (until email is switched on) by hand. */
export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState<{ emailed: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      setSent(await requestPasswordReset(identifier.trim()));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send a reset link.');
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className="login-page">
        <div className="login-form">
          <AuthHeader title={sent.emailed ? 'Check your email' : 'Ask your host'} />
          {/* Worded the same whether or not an account matched, as the server's answer is. */}
          {sent.emailed ? (
            <p className="login-subtitle">
              If that matches an account, a reset link is on its way to its email address.
              It works once, for three days.
            </p>
          ) : (
            <p className="login-subtitle">
              Reset links aren't emailed yet. Ask whoever invited you to send you one.
              It works once, for three days.
            </p>
          )}
          <Link className="login-link" to="/login">Back to sign in</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="login-page">
      <form className="login-form" onSubmit={handleSubmit}>
        <AuthHeader title="Forgot your password?" />
        <p className="login-subtitle">We'll make you a link to choose a new one.</p>
        <FormField label="Email or username" htmlFor="forgot-identifier">
          <input
            id="forgot-identifier"
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
        {error && <p className="login-error" role="alert">{error}</p>}
        <Button type="submit" variant="primary" disabled={submitting || !identifier.trim()}>
          {submitting ? 'Sending…' : 'Get a reset link'}
        </Button>
        <Link className="login-link" to="/login">Back to sign in</Link>
      </form>
    </div>
  );
}
