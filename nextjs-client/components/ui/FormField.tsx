import { ReactNode, InputHTMLAttributes } from "react";
import { Input } from "./Input";

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

function FormField({ label, id, error, ...inputProps }: FormFieldProps) {
  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      <Input id={id} error={!!error} {...inputProps} />
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}

interface FormMessageProps {
  type: "error" | "success";
  children: ReactNode;
}

function FormMessage({ type, children }: FormMessageProps) {
  const className = type === "error" ? "form-error" : "form-message";
  return <p className={className}>{children}</p>;
}

export { FormField, FormMessage };
export type { FormFieldProps, FormMessageProps };
