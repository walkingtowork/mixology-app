import './LoadingSpinner.css';

interface LoadingSpinnerProps {
  label?: string;
}

export default function LoadingSpinner({ label = 'Loading…' }: LoadingSpinnerProps) {
  return (
    <div className="loading-spinner-wrap">
      <div className="loading-spinner" />
      <span>{label}</span>
    </div>
  );
}
