import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", error, ...props }, ref) => {
    const errorClass = error ? "border-red-500" : "";
    const finalClassName = `${errorClass} ${className}`.trim();

    return <input ref={ref} className={finalClassName} {...props} />;
  }
);

Input.displayName = "Input";

export { Input };
export type { InputProps };
