"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ConnectButton from "@/components/ui/ConnectButton";
import NetworkBadge from "@/components/botchain/NetworkBadge";
import { footerLinks } from "@/lib/botchain/chain";
import BuiltOnBotChain from "@/components/botchain/BuiltOnBotChain";
import { app } from "@/lib/app-config";

interface PageShellProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export default function PageShell({ children, title, subtitle }: PageShellProps) {
  const currentPath = usePathname();
  const chainLinks = footerLinks();

  const benchNav = [
    { name: "Public Docket", path: "/" },
    { name: "Lodge Dispute", path: "/open" },
    { name: "My Caseload", path: "/me" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-base)] text-[var(--text-primary)]">
      {/* Courtroom Upper Bar */}
      <div className="bg-[var(--bg-surface)] border-b border-[var(--border-default)] shadow-xs sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 no-underline">
              <span className="text-2xl" aria-hidden="true">⚖️</span>
              <div>
                <span className="font-serif font-bold text-lg text-[var(--accent)] tracking-tight block leading-tight">
                  {app.name}
                </span>
                <span className="text-[9px] uppercase tracking-wider text-[var(--text-muted)] font-mono block">
                  Peer Court
                </span>
              </div>
            </Link>

            <div className="hidden sm:flex items-center gap-2">
              {benchNav.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`px-3 py-1 text-xs uppercase font-sans font-bold tracking-wider rounded-xs transition-colors ${
                    currentPath === item.path
                      ? "bg-[var(--accent)] text-[var(--accent-ink)]"
                      : "text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <NetworkBadge />
            <div className="w-[140px] sm:w-[160px]">
              <ConnectButton />
            </div>
          </div>
        </div>

        {/* Mobile strip */}
        <div className="sm:hidden flex border-t border-[var(--border-subtle)] px-2 py-1 justify-around text-xs font-bold uppercase">
          {benchNav.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`p-1 ${
                currentPath === item.path ? "text-[var(--accent)] underline" : "text-[var(--text-muted)]"
              }`}
            >
              {item.name}
            </Link>
          ))}
        </div>
      </div>

      {/* Main Bench Workspace */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {(title || subtitle) && (
          <div className="mb-6 space-y-1">
            {title && (
              <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-primary)]">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-xs sm:text-sm text-[var(--text-muted)] font-sans">
                {subtitle}
              </p>
            )}
          </div>
        )}
        {children}
      </main>

      {/* Mandatory 3-link Footer */}
      <footer className="mt-auto bg-[var(--bg-surface)] border-t border-[var(--border-default)] py-5 text-xs text-[var(--text-muted)] font-sans">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-5 flex-wrap justify-center sm:justify-start">
            {chainLinks.contract && (
              <a
                href={chainLinks.contract}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4 hover:text-[var(--text-primary)]"
              >
                Contract
              </a>
            )}
            <a
              href={chainLinks.site}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-[var(--text-primary)]"
            >
              botchain.ai
            </a>
            <a
              href={chainLinks.explorer}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-[var(--text-primary)]"
            >
              Explorer
            </a>
          </div>
          <BuiltOnBotChain />
        </div>
      </footer>
    </div>
  );
}
