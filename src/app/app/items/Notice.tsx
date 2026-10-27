import type { ReactNode } from "react";

export type Tone = "info" | "warn" | "danger" | "success";

// A persistent notice: title, optional line, and recovery actions beside it. Errors announce themselves; the rest wait to be read.
export function Notice({ tone, title, body, role, children }: { tone: Tone; title: string; body?: string; role?: "alert" | "status"; children?: ReactNode }) {
  return (
    <div className={`notice-card notice-${tone}`} role={role ?? (tone === "danger" ? "alert" : undefined)}>
      <p className="notice-title">{title}</p>
      {body && <p>{body}</p>}
      {children && <div className="notice-actions">{children}</div>}
    </div>
  );
}

// Nothing to show yet, or nothing that matches: a short message, one help line, and the way out.
export function EmptyState({ title, body, children }: { title: string; body?: string; children?: ReactNode }) {
  return (
    <div className="empty-state">
      <p className="notice-title">{title}</p>
      {body && <p>{body}</p>}
      {children}
    </div>
  );
}

// Polite confirmation after a save, with a way to the saved item. Read by screen readers without taking focus.
export function SaveToast({ title, href, link }: { title: string; href: string; link: string }) {
  return (
    <div className="save-toast" role="status" aria-live="polite">
      <span>{title}</span> <a href={href}>{link}</a>
    </div>
  );
}

// Flat placeholder rows while Items load.
export function ItemsSkeleton({ rows = 4, label }: { rows?: number; label: string }) {
  return (
    <div className="items-skeleton" aria-busy="true">
      <p role="status" className="sr-only">{label}</p>
      <div className="skeleton-line search" aria-hidden="true" />
      {Array.from({ length: rows }, (_, i) => <div key={i} className="skeleton-row" aria-hidden="true"><span className="skeleton-line" /><span className="skeleton-line" /></div>)}
    </div>
  );
}
