// Sidebar icons from the design file: 22px, filled with white details, search and hash as outlines. Decorative.
const f = { fill: "currentColor", "aria-hidden": true } as const;
const o = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

export function SideIcon({ name, size = 22 }: { name: "home" | "bag" | "play" | "gear" | "plus" | "hash" | "chevrons" | "collapse" | "add"; size?: number }) {
  switch (name) {
    case "home": return <svg width={size} height={size} viewBox="0 0 24 24" {...f}><path d="M12 2.8 2.8 10.4V20a1.2 1.2 0 0 0 1.2 1.2h5.4v-6.4h5.2v6.4H20a1.2 1.2 0 0 0 1.2-1.2v-9.6z" /></svg>;
    case "bag": return <svg width={size} height={size} viewBox="0 0 24 24" {...f}><rect x="4.5" y="3.5" width="15" height="18" rx="3" /><rect x="9" y="1.8" width="6" height="3.4" rx="1.2" /></svg>;
    case "play": return <svg width={size} height={size} viewBox="0 0 24 24" {...f}><rect x="2.5" y="4" width="19" height="16" rx="3.5" /><path d="M10 9v6l5-3z" fill="var(--side-bg)" /></svg>;
    case "gear": return <svg width={size} height={size} viewBox="0 0 24 24" {...f}><path d="M12 2l1.8 2.4 3-.5.9 2.9 2.8 1.2-.8 3 1.6 2.6-2.2 2.1-.1 3.1-3 .6-1.9 2.4-2.7-1.4-2.7 1.4-1.9-2.4-3-.6-.1-3.1L2.5 13.6l1.6-2.6-.8-3 2.8-1.2.9-2.9 3 .5z" /><circle cx="12" cy="12" r="3" fill="var(--side-bg)" /></svg>;
    case "plus": return <svg width={size} height={size} viewBox="0 0 24 24" {...o}><path d="M12 4.5v15M4.5 12h15" /></svg>;
    case "hash": return <svg width={size} height={size} viewBox="0 0 24 24" {...o}><path d="M9.5 3.5 7.5 20.5M16.5 3.5l-2 17M4 8.5h16.5M3.5 15.5H20" /></svg>;
    case "chevrons": return <svg width={size} height={size} viewBox="0 0 16 16" {...o} strokeWidth={1.6}><path d="m4.5 6.5 3.5-3.5 3.5 3.5M4.5 9.5 8 13l3.5-3.5" /></svg>;
    case "collapse": return <svg width={size} height={size} viewBox="0 0 16 16" {...o} strokeWidth={1.6}><path d="M8.5 4 4.5 8l4 4M12.5 4l-4 4 4 4" /></svg>;
    case "add": return <svg width={size} height={size} viewBox="0 0 24 24" {...o} strokeWidth={2.2}><path d="M12 4.5v15M4.5 12h15" /></svg>;
  }
}
