import { HTMLAttributes, forwardRef } from "react";

type CardVariant = "default" | "auth" | "server-message" | "welcome" | "section";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
}

const variantClasses: Record<CardVariant, string> = {
  default: "",
  auth: "auth-card",
  "server-message": "server-message-card",
  welcome: "welcome-card",
  section: "profile-section",
};

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ children, variant = "default", className = "", ...props }, ref) => {
    const baseClass = variantClasses[variant];
    const finalClassName = `${baseClass} ${className}`.trim();

    return (
      <div ref={ref} className={finalClassName} {...props}>
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

export { Card };
export type { CardProps };
