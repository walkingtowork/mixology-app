import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import { createInvite, fetchInvite } from '../../services/cocktailsApi';
import type { Invite } from '../../types/cocktails';
import Button from '../ui/Button';
import './InviteDialog.css';

/** How often the open screen checks whether its code has been used. */
const POLL_MS = 3000;
/** How long "✓ sam joined" shows before the next code replaces it. */
const JOINED_MS = 2500;

/**
 * A full-screen QR code for a fresh single-use invite, shown to someone in person.
 * When the code is used it says who joined and makes the next one by itself, so a phone
 * passed around a table never shows a spent code.
 */
export default function InviteDialog({ onClose }: { onClose: () => void }) {
  const [invite, setInvite] = useState<Invite | null>(null);
  const [joined, setJoined] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const linkRef = useRef<HTMLInputElement>(null);

  const fetchCode = useCallback(() => {
    createInvite()
      .then(setInvite)
      .catch(err => setError(err instanceof Error ? err.message : 'Could not make an invite'));
  }, []);

  const newCode = useCallback(() => {
    setError(null);
    setJoined(null);
    setCopied(false);
    fetchCode();
  }, [fetchCode]);

  useEffect(fetchCode, [fetchCode]);

  // Watch the current code until someone uses it.
  useEffect(() => {
    if (!invite || joined) return;
    const timer = setInterval(async () => {
      try {
        const latest = await fetchInvite(invite.id);
        if (latest.used_by) setJoined(latest.used_by);
      } catch {
        // A missed check is harmless; the next one will catch up.
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [invite, joined]);

  useEffect(() => {
    if (!joined) return;
    const timer = setTimeout(newCode, JOINED_MS);
    return () => clearTimeout(timer);
  }, [joined, newCode]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const copyLink = async () => {
    if (!invite) return;
    try {
      await navigator.clipboard.writeText(invite.url);
      setCopied(true);
    } catch {
      // No clipboard access: select the text so it can be copied by hand.
      linkRef.current?.select();
    }
  };

  return createPortal(
    <div className="invite-screen" role="dialog" aria-modal="true" aria-labelledby="invite-title">
      <button className="invite-close" onClick={onClose} aria-label="Close">✕</button>
      <h2 className="invite-title" id="invite-title">Join The Bar Cart</h2>

      {error ? (
        <>
          <p className="invite-error" role="alert">{error}</p>
          <Button variant="secondary" onClick={newCode}>Try again</Button>
        </>
      ) : (
        <>
          {joined && <p className="invite-joined" role="status">✓ {joined} joined</p>}
          <div className={`invite-qr${joined || !invite ? ' is-spent' : ''}`}>
            {invite
              ? <QRCodeSVG value={invite.url} size={240} marginSize={0} title="Invite QR code" />
              : <div className="invite-qr-placeholder" />}
          </div>
          {joined ? (
            <p className="invite-hint">Making a new code…</p>
          ) : (
            <>
              <p className="invite-hint">Scan to create your account. Works once, for 24 hours.</p>
              <div className="invite-link">
                <input
                  ref={linkRef}
                  type="text"
                  value={invite?.url ?? ''}
                  readOnly
                  aria-label="Invite link"
                  onFocus={e => e.target.select()}
                />
                <button type="button" onClick={copyLink} disabled={!invite}>
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <Button variant="secondary" onClick={newCode} disabled={!invite}>New code</Button>
            </>
          )}
        </>
      )}
    </div>,
    document.body,
  );
}
