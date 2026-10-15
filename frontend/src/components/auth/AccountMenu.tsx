import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import InviteDialog from './InviteDialog';
import UserAvatar from './UserAvatar';
import './AccountMenu.css';

/** The signed-in user's chip in the top bar, opening a small menu. */
export default function AccountMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (!user) return null;

  return (
    <div className="account-menu" ref={ref}>
      <button
        className="account-chip"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account: ${user.username}`}
      >
        <UserAvatar user={user} />
        <span className="account-name">{user.username}</span>
      </button>
      {open && (
        <div className="account-dropdown" role="menu">
          <p className="account-who">Signed in as <strong>{user.username}</strong></p>
          <Link
            to="/account"
            className="account-item"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            Personal info
          </Link>
          {user.can_invite && (
            <button
              className="account-item"
              role="menuitem"
              onClick={() => { setOpen(false); setInviting(true); }}
            >
              Invite someone
            </button>
          )}
          <button className="account-item" role="menuitem" onClick={logout}>Log out</button>
        </div>
      )}
      {inviting && <InviteDialog onClose={() => setInviting(false)} />}
    </div>
  );
}
