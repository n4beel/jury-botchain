"use client";

import { CSSProperties, HTMLAttributes, ReactNode } from "react";

export interface BenchPanelProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title?: ReactNode;
  description?: ReactNode;
  stamp?: ReactNode;
  action?: ReactNode;
  variant?: "parchment" | "docket" | "raised";
}

export default function Panel({
  title,
  description,
  stamp,
  action,
  variant = "parchment",
  children,
  className = "",
  style,
  ...props
}: BenchPanelProps) {
  const panelBg =
    variant === "docket"
      ? "var(--bg-elevated)"
      : variant === "raised"
      ? "var(--bg-overlay)"
      : "var(--bg-surface)";

  const customStyles: CSSProperties = {
    backgroundColor: panelBg,
    borderColor: "var(--border-default)",
    ...style,
  };

  return (
    <section
      className={`border rounded p-5 sm:p-6 shadow-sm relative ${className}`}
      style={customStyles}
      {...props}
    >
      {(title || description || stamp || action) && (
        <header className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-[var(--border-subtle)]">
          <div>
            {title && (
              <h2 className="font-serif text-lg font-bold text-[var(--text-primary)]">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-xs text-[var(--text-muted)] mt-0.5 font-sans">
                {description}
              </p>
            )}
          </div>
          {(stamp || action) && (
            <div className="flex items-center gap-2">
              {stamp && (
                <div className="font-serif uppercase font-bold text-xs px-2.5 py-0.5 border border-[var(--accent)] text-[var(--accent)] tracking-wider">
                  {stamp}
                </div>
              )}
              {action}
            </div>
          )}
        </header>
      )}
      <div>{children}</div>
    </section>
  );
}
