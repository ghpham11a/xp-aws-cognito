import { ButtonHTMLAttributes, forwardRef } from "react";

export type ButtonVariant = "primary" | "secondary" | "danger" | "link" | "social" | "social-apple";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
  loadingText?: string;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "auth-button",
  secondary: "social-button",
  danger: "signout-button",
  link: "link-button",
  social: "social-button",
  "social-apple": "social-button social-button-apple",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      loading = false,
      loadingText,
      disabled,
      className = "",
      ...props
    },
    ref
  ) => {
    const baseClass = variantClasses[variant];
    const finalClassName = `${baseClass} ${className}`.trim();

    return (
      <button
        ref={ref}
        className={finalClassName}
        disabled={disabled || loading}
        {...props}
      >
        {loading && loadingText ? loadingText : children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
export type { ButtonProps };
