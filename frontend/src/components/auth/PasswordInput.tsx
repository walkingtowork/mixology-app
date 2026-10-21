import { useState } from 'react';
import './PasswordInput.css';

interface PasswordInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: 'current-password' | 'new-password';
  /** Names the field on the toggle, as in "Show new password", so each toggle is distinct. */
  label: string;
}

/** A password field with its own Show/Hide button inside its right edge. */
export default function PasswordInput({ id, value, onChange, autoComplete, label }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const action = visible ? 'Hide' : 'Show';
  return (
    <div className="password-input">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setVisible(v => !v)}
        aria-label={`${action} ${label.toLowerCase()}`}
      >
        {action}
      </button>
    </div>
  );
}
