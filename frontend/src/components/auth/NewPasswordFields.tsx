import { useState } from 'react';
import FormField from '../ui/FormField';

interface NewPasswordFieldsProps {
  /** Prefixes the input ids, so two forms on one page could not collide. */
  idPrefix: string;
  password: string;
  confirm: string;
  onPasswordChange: (value: string) => void;
  onConfirmChange: (value: string) => void;
  /** "Password" at signup, "New password" on a reset. The confirm label follows it. */
  label?: string;
}

/** A new password typed twice, with one Show/Hide button for both. Used at signup and reset. */
export default function NewPasswordFields({
  idPrefix, password, confirm, onPasswordChange, onConfirmChange, label = 'Password',
}: NewPasswordFieldsProps) {
  const [showPassword, setShowPassword] = useState(false);
  const confirmProblem = confirm && confirm !== password ? "The passwords don't match." : undefined;

  return (
    <>
      <FormField label={label} htmlFor={`${idPrefix}-password`}>
        <div className="password-input">
          <input
            id={`${idPrefix}-password`}
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={e => onPasswordChange(e.target.value)}
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
      <FormField label={`Confirm ${label.toLowerCase()}`} htmlFor={`${idPrefix}-confirm`} error={confirmProblem}>
        <input
          id={`${idPrefix}-confirm`}
          type={showPassword ? 'text' : 'password'}
          value={confirm}
          onChange={e => onConfirmChange(e.target.value)}
          autoComplete="new-password"
        />
      </FormField>
    </>
  );
}
