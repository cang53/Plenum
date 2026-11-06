// Open line icons from the canvas, keyed by page path. Decorative: the link carries the name.
const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;
const ICONS: Record<string, React.ReactNode> = {
  "/app": <><rect x="3.5" y="3.5" width="7" height="7" rx="2" /><rect x="13.5" y="3.5" width="7" height="7" rx="3.5" /><rect x="3.5" y="13.5" width="7" height="7" rx="2" /><rect x="13.5" y="13.5" width="7" height="7" rx="2" /></>,
  "/app/stream": <path d="M20.5 12a8.5 8 0 0 1-12.3 7.2L3.5 20.5l1.4-4.1A8.5 8 0 1 1 20.5 12z" />,
  "/app/gantt": <path d="M4 6h9M8 12h12M6 18h8" />,
  "/app/board": <><rect x="3.5" y="4" width="17" height="16" rx="3" /><path d="M9.5 4v16M15 4v16" /></>,
  "/app/items": <><rect x="4" y="3.5" width="16" height="17" rx="3" /><path d="M8.5 9h7M8.5 13h7M8.5 17h4" /></>,
  "/app/risks": <><path d="M12 4l9 16H3z" /><path d="M12 10v4M12 17v.5" /></>,
  "/app/library": <path d="M3.5 7a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" />,
  "/app/reports": <><rect x="3.5" y="3.5" width="17" height="17" rx="3" /><path d="M8 16v-4M12 16V8M16 16v-6" /></>,
  "/app/members": <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6" /></>,
  "/app/settings": <><circle cx="12" cy="12" r="3.2" /><path d="M12 2.5v2.6M12 18.9v2.6M2.5 12h2.6M18.9 12h2.6M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" /></>,
  bell: <path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4zM10 21h4" />,
};
export function NavIcon({ name, size = 21 }: { name: string; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" {...p}>{ICONS[name]}</svg>;
}
