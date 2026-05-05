import './FormField.css';

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}

export default function FormField({ label, htmlFor, required, error, children }: FormFieldProps) {
  return (
    <div className={`form-field${error ? ' has-error' : ''}`}>
      <label className="form-field-label" htmlFor={htmlFor}>
        {label}
        {required && <span className="form-field-required">*</span>}
      </label>
      {children}
      {error && <span className="form-field-error">{error}</span>}
    </div>
  );
}
