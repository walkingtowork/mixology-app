import FormField from '../ui/FormField';
import PasswordInput from './PasswordInput';

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

/** A new password typed twice, each with its own Show/Hide button. Used at signup, reset and on Personal Info. */
export default function NewPasswordFields({
  idPrefix, password, confirm, onPasswordChange, onConfirmChange, label = 'Password',
}: NewPasswordFieldsProps) {
  const confirmLabel = `Confirm ${label.toLowerCase()}`;
  const confirmProblem = confirm && confirm !== password ? "The passwords don't match." : undefined;

  return (
    <>
      <FormField label={label} htmlFor={`${idPrefix}-password`}>
        <PasswordInput
          id={`${idPrefix}-password`}
          value={password}
          onChange={onPasswordChange}
          autoComplete="new-password"
          label={label}
        />
      </FormField>
      <FormField label={confirmLabel} htmlFor={`${idPrefix}-confirm`} error={confirmProblem}>
        <PasswordInput
          id={`${idPrefix}-confirm`}
          value={confirm}
          onChange={onConfirmChange}
          autoComplete="new-password"
          label={confirmLabel}
        />
      </FormField>
    </>
  );
}
