import type { User, GlassType } from '../../types/cocktails';
import GlassIcon from '../ui/GlassIcon';
import './UserAvatar.css';

// Each glass is drawn somewhere different in its 50px box (a shot glass sits low), so it is
// centred on its drawn height, measured from the icons, rather than on the box.
const DRAWN_CENTRE_Y: Record<GlassType, number> = {
  rocks: 25,
  old_fashioned: 26.5,
  martini: 29,
  coupe: 27.5,
  champagne_flute: 27.5,
  collins: 27.5,
  shot: 33,
  glencairn: 26.5,
};

const DISC = 32;
const GLASS_SCALE = 0.62;

/** The user's picture: their chosen glass on a white disc, or their initial. Decorative. */
export default function UserAvatar({ user }: { user: Pick<User, 'username' | 'avatar_glass'> }) {
  const glass = user.avatar_glass;
  if (!glass) {
    return (
      <span className="user-avatar" aria-hidden="true">
        {user.username.charAt(0).toUpperCase()}
      </span>
    );
  }
  const inset = (DISC - 50 * GLASS_SCALE) / 2;
  const shiftY = (25 - DRAWN_CENTRE_Y[glass]) * GLASS_SCALE;
  return (
    <span className="user-avatar" aria-hidden="true">
      <span
        className="user-avatar-glass"
        style={{ transform: `translate(${inset}px, ${inset + shiftY}px) scale(${GLASS_SCALE})` }}
      >
        <GlassIcon glass={glass} tooltip={false} />
      </span>
    </span>
  );
}
