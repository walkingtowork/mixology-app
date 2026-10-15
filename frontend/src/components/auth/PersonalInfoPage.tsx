import { useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { changePassword, updateProfile } from '../../services/cocktailsApi';
import { GLASS_OPTIONS, type GlassType, type ProfileChanges, type User } from '../../types/cocktails';
import Button from '../ui/Button';
import FormField from '../ui/FormField';
import GlassIcon from '../ui/GlassIcon';
import NewPasswordFields from './NewPasswordFields';
import './PersonalInfoPage.css';

type Avatar = GlassType | '';

/** Pick a glass as your picture, or keep your initial. */
function AvatarPicker({ username, value, onChange }: {
  username: string;
  value: Avatar;
  onChange: (value: Avatar) => void;
}) {
  const options: { value: Avatar; label: string }[] = [{ value: '', label: 'Initial' }, ...GLASS_OPTIONS];
  return (
    <div className="avatar-picker" role="radiogroup" aria-label="Your picture">
      {options.map(option => (
        <label key={option.value || 'initial'} className={`avatar-tile${value === option.value ? ' selected' : ''}`}>
          <input
            type="radio"
            id={`avatar-${option.value || 'initial'}`}
            name="avatar"
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
          />
          <span className="avatar-tile-art" aria-hidden="true">
            {option.value
              ? <GlassIcon glass={option.value} tooltip={false} />
              : <span className="avatar-tile-initial">{username.charAt(0).toUpperCase()}</span>}
          </span>
          <span className="avatar-tile-label">{option.label}</span>
        </label>
      ))}
    </div>
  );
}

/** Name, email and picture. A new email needs the current password: it is how you sign in. */
function ProfileForm({ user }: { user: User }) {
  const { updateUser } = useAuth();
  const [fullname, setFullname] = useState(user.fullname);
  const [email, setEmail] = useState(user.email);
  const [avatar, setAvatar] = useState<Avatar>(user.avatar_glass);
  const [currentPassword, setCurrentPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const emailChanged = email.trim() !== user.email;
  const changed = emailChanged || fullname.trim() !== user.fullname || avatar !== user.avatar_glass;
  const ready = changed && email.trim() !== '' && (!emailChanged || currentPassword !== '');

  const edit = <T,>(set: (value: T) => void) => (value: T) => {
    set(value);
    setSaved(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    const changes: ProfileChanges = { fullname: fullname.trim(), avatar_glass: avatar };
    if (emailChanged) {
      changes.email = email.trim();
      changes.current_password = currentPassword;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await updateProfile(changes);
      updateUser(updated);
      setFullname(updated.fullname);
      setEmail(updated.email);
      setCurrentPassword('');
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your details.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="personal-info-section" onSubmit={handleSubmit} aria-labelledby="profile-heading">
      <h2 id="profile-heading">Your details</h2>
      <FormField label="Username" htmlFor="profile-username">
        <input id="profile-username" value={user.username} readOnly disabled />
      </FormField>
      <p className="personal-info-hint">Your username can't be changed.</p>
      <FormField label="Full name" htmlFor="profile-fullname">
        <input
          id="profile-fullname"
          value={fullname}
          onChange={e => edit(setFullname)(e.target.value)}
          autoComplete="name"
          maxLength={150}
        />
      </FormField>
      <FormField label="Email" htmlFor="profile-email">
        <input
          id="profile-email"
          type="email"
          value={email}
          onChange={e => edit(setEmail)(e.target.value)}
          autoComplete="email"
        />
      </FormField>
      {emailChanged && (
        <FormField label="Current password" htmlFor="profile-current-password">
          <input
            id="profile-current-password"
            type="password"
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
          />
        </FormField>
      )}
      {emailChanged && (
        <p className="personal-info-hint">
          You sign in with your email, so changing it needs your password.
        </p>
      )}
      <fieldset className="personal-info-fieldset">
        <legend>Your picture</legend>
        <p className="personal-info-hint">Shown on your account button at the top of the page.</p>
        <AvatarPicker username={user.username} value={avatar} onChange={edit(setAvatar)} />
      </fieldset>
      {error && <p className="personal-info-error" role="alert">{error}</p>}
      <div className="personal-info-actions">
        <Button type="submit" variant="primary" disabled={!ready || saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
        {saved && <span className="personal-info-saved" role="status">Saved</span>}
      </div>
    </form>
  );
}

function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const ready = currentPassword !== '' && password !== '' && confirm === password;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    setSaving(true);
    setError(null);
    setDone(false);
    try {
      await changePassword(currentPassword, password);
      setCurrentPassword('');
      setPassword('');
      setConfirm('');
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change your password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="personal-info-section" onSubmit={handleSubmit} aria-labelledby="password-heading">
      <h2 id="password-heading">Change password</h2>
      <FormField label="Current password" htmlFor="password-current">
        <input
          id="password-current"
          type="password"
          value={currentPassword}
          onChange={e => setCurrentPassword(e.target.value)}
          autoComplete="current-password"
        />
      </FormField>
      <NewPasswordFields
        idPrefix="password-new"
        label="New password"
        password={password}
        confirm={confirm}
        onPasswordChange={setPassword}
        onConfirmChange={setConfirm}
      />
      {error && <p className="personal-info-error" role="alert">{error}</p>}
      <div className="personal-info-actions">
        <Button type="submit" variant="primary" disabled={!ready || saving}>
          {saving ? 'Changing…' : 'Change password'}
        </Button>
      </div>
      {done && (
        <p className="personal-info-saved" role="status">
          Password changed. You're still signed in here; any other devices have been signed out.
        </p>
      )}
    </form>
  );
}

/** Your own account: details, picture and password. */
export default function PersonalInfoPage() {
  const { user } = useAuth();
  // Only reachable through RequireAuth, so there is always a user.
  if (!user) return null;
  return (
    <div className="personal-info">
      <h1>Personal info</h1>
      <ProfileForm user={user} />
      <PasswordForm />
    </div>
  );
}
