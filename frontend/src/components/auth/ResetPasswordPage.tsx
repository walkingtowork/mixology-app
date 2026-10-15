import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { checkPasswordReset } from '../../services/cocktailsApi';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import AuthHeader from './AuthHeader';
import NewPasswordFields from './NewPasswordFields';
import './LoginPage.css';

/** Where a reset link lands: check the link, then set a new password and sign in. */
export default function ResetPasswordPage() {
  const { uid = '', token = '' } = useParams<{ uid: string; token: string }>();
  const { resetPassword } = useAuth();
  const [link, setLink] = useState<'checking' | 'ok' | string>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkPasswordReset(uid, token)
      .then(() => setLink('ok'))
      .catch(err => setLink(err instanceof Error ? err.message : "This reset link isn't valid."));
  }, [uid, token]);

  if (done) return <Navigate to="/" replace />;
  if (link === 'checking') return <LoadingSpinner />;

  if (link !== 'ok') {
    return (
      <div className="login-page">
        <div className="login-form">
          <AuthHeader title="Reset your password" />
          <p className="login-error login-error-centered" role="alert">{link}</p>
          <Link className="login-link" to="/forgot-password">Get a new link</Link>
        </div>
      </div>
    );
  }

  const ready = password && confirm === password;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    setSubmitting(true);
    setError(null);
    try {
      await resetPassword(uid, token, password);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset your password.');
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <form className="login-form" onSubmit={handleSubmit}>
        <AuthHeader title="Reset your password" />
        <p className="login-subtitle">Choose a new password. You'll be signed in with it.</p>
        <NewPasswordFields
          idPrefix="reset"
          label="New password"
          password={password}
          confirm={confirm}
          onPasswordChange={setPassword}
          onConfirmChange={setConfirm}
        />
        {error && <p className="login-error" role="alert">{error}</p>}
        <Button type="submit" variant="primary" disabled={submitting || !ready}>
          {submitting ? 'Saving…' : 'Set new password'}
        </Button>
      </form>
    </div>
  );
}
