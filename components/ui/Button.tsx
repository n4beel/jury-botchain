"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";

export interface JuryActionBtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  intent?: "verdict" | "standard" | "docket" | "danger" | "outline";
  scale?: "sm" | "md" | "lg";
  isSpinning?: boolean;
}

const JuryButton = forwardRef<HTMLButtonElement, JuryActionBtnProps>(
  (
    {
      children,
      intent = "verdict",
      scale = "md",
      disabled,
      isSpinning = false,
      className = "",
      ...rest
    },
    ref
  ) => {
    const scaleMap = {
      sm: "px-2.5 py-1 text-xs font-semibold uppercase tracking-wider",
      md: "px-4 py-2 text-sm font-semibold tracking-wide",
      lg: "px-5 py-2.5 text-base font-bold tracking-wide",
    }[scale];

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
    }[intent];

    return (
      <button
        ref={ref}
        disabled={disabled || isSpinning}
        className={`inline-flex items-center justify-center font-sans rounded-xs transition duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed select-none ${scaleMap} ${intentMap} ${className}`}
        {...rest}
      >
        {isSpinning ? (
          <span className="inline-flex items-center gap-2">
            <svg
              className="animate-spin h-3.5 w-3.5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
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
