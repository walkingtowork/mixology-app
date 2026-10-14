import { Navigate, useLocation } from 'react-router-dom';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useAuth } from './AuthContext';

/** Renders its children only for a signed-in user; anyone else goes to the login page. */
export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading, returnAfterLogin } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingSpinner />;
  if (!user) {
    return <Navigate to="/login" replace state={returnAfterLogin ? { from: location } : null} />;
  }
  return children;
}
