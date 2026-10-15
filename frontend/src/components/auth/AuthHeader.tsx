/** The glass and heading at the top of every signed-out page: the app's front door. */
export default function AuthHeader({ title }: { title: string }) {
  return (
    <>
      {/* The same glass as the home page. */}
      <div className="login-glass" aria-hidden="true">
        <div className="martini-glass">
          <div className="glass" />
          <div className="glass-left-edge" />
          <div className="glass-right-edge" />
          <div className="stem" />
          <div className="base" />
        </div>
      </div>
      <h1 className="login-title">{title}</h1>
    </>
  );
}
