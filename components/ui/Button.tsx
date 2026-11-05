"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";

export interface JuryActionBtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  intent?: "verdict" | "standard" | "docket" | "danger" | "outline";
  scale?: "sm" | "md" | "lg";
  isSpinning?: boolean;
  // Aliases for compatibility across scaffolded components
  variant?: "verdict" | "standard" | "docket" | "danger" | "outline" | "ghost" | "primary" | "secondary";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  look?: string;
}

const JuryButton = forwardRef<HTMLButtonElement, JuryActionBtnProps>(
  (
    {
      children,
      intent = "verdict",
      scale = "md",
      disabled,
      isSpinning = false,
      variant,
      size,
      loading,
      look,
      className = "",
      ...rest
    },
    ref
  ) => {
    // Resolve alias props
    const effectiveScale = size || scale;
    const effectiveSpinning = loading !== undefined ? loading : isSpinning;

    let effectiveIntent = intent;
    if (variant === "ghost" || variant === "secondary" || look === "subtle") {
      effectiveIntent = "outline";
    } else if (variant === "danger") {
      effectiveIntent = "danger";
    } else if (variant === "primary" || variant === "verdict") {
      effectiveIntent = "verdict";
    }

    const scaleMap = {
      sm: "px-2.5 py-1 text-xs font-semibold uppercase tracking-wider",
      md: "px-4 py-2 text-sm font-semibold tracking-wide",
      lg: "px-5 py-2.5 text-base font-bold tracking-wide",
    }[effectiveScale];

    const intentMap = {
      verdict:
        "bg-[var(--accent)] text-[var(--accent-ink)] hover:opacity-90 active:scale-[0.98] border border-[var(--accent)] shadow-sm",
      standard:
        "bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-default)] hover:bg-[var(--bg-elevated)] active:scale-[0.98]",
      docket:
        "bg-[var(--border-strong)] text-[var(--accent-ink)] hover:opacity-90 active:scale-[0.98] border border-transparent",
      danger:
        "bg-[var(--danger)] text-white hover:opacity-90 active:scale-[0.98] border border-transparent",
      outline:
        "bg-transparent text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] border border-[var(--border-default)]",
    }[effectiveIntent];

    return (
      <button
        ref={ref}
        disabled={disabled || effectiveSpinning}
        className={`inline-flex items-center justify-center font-sans rounded-xs transition duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed select-none ${scaleMap} ${intentMap} ${className}`}
        {...rest}
      >
        {effectiveSpinning ? (
          <span className="inline-flex items-center gap-2">
            <span
              className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"
              aria-hidden="true"
            />
            <span>{children}</span>
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);

JuryButton.displayName = "JuryButton";

export default JuryButton;
