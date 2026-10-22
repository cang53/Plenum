# UI redesign backlog: Liquid Glass

Source: the Figma AI export SS picked (Vite prototype: `liquid.css` tokens, `ui.tsx` primitives, `Overview.tsx`, sage/pearl palette, floating frosted sidebar, ambient gradient background, dense content cards). We port the look to the Next.js app and improve it with Apple's Liquid Glass patterns.

## Principles
- **Glass for navigation and controls only** (sidebar, top bar, segmented switches, dialogs, menus). Content (cards, tables, board columns) sits on dense, near-opaque surfaces so text stays readable.
- **Depth**: blur plus saturation, a 1px specular top edge, soft layered shadow, concentric continuous corners (`corner-shape: squircle` where supported, else radius).
- **Type**: system stack (`-apple-system`, SF where present), Apple-like scale, tight tracking on large titles, tabular numbers for dates and counts.
- **Motion**: short ease-out transitions; hover lift and press scale only on controls; all disabled under `prefers-reduced-motion`.
- **Accessibility**: WCAG AA (4.5:1 text, 3:1 UI) measured on the glass over the worst-case background, in light and dark. `prefers-reduced-transparency` and `prefers-contrast: more` swap glass for opaque tokens; also the fallback when `backdrop-filter` is missing. Visible focus ring everywhere.
- **Kept intact**: EN/NL strings through `messages.*` (no hard-coded copy), roles and RLS, existing tests, no per-person analytics (pulse is aggregate only), every AI change keeps its human click and source link.
- Improvements over the Figma: fewer simultaneous blur layers (performance), dark mode derived from the same tokens, system light/dark by default, `color-mix()` tints instead of hand-picked alpha hex, Apple-style sidebar collapse on narrow screens, tab-bar style nav on phones.

## Tasks
One PR per row, about 400 changed lines or fewer. Order matters. UI-n touches CSS and markup only, no data or server logic.

| # | Task | Done when |
|---|------|-----------|
| UI-1 | Design tokens | `src/app/tokens.css`: color, glass, radius, shadow, type, spacing, motion tokens for light and dark; reduced-transparency, high-contrast and no-`backdrop-filter` fallbacks; `globals.css` imports it and the old variables map to it; contrast test over the token pairs |
| UI-2 | Glass primitives | `.glass`, `.surface`, `.btn` (primary, secondary, plain), `.field`, `.badge`, `.segmented`, focus ring, `.dialog` in CSS; a `/demo/ui` kitchen-sink page showing every state in EN/NL |
| UI-3 | App shell | Floating glass sidebar (brand, project switcher, nav with active state, role-aware items), top bar with search and account, ambient background, skip link; collapses on tablet, bottom bar on phone; strings via `messages` |
| UI-4 | Overview screen | `/app/page.tsx` as project overview: project cards, attention items, aggregate pulse ring (no individuals), link into AI review |
| UI-5 | Board | Board columns as dense cards on the ambient background, task cards with status/priority/due, drag affordance, segmented work-view switch (Board / Timeline / Items) |
| UI-6 | Timeline | Timeline bars with status colors, today marker, readable at AA; same switcher |
| UI-7 | Items list | Table in a dense surface, sticky glass header, filters as segmented/menus, row hover, empty state |
| UI-8 | AI review and notifications | Suggestion cards with source-message link and explicit Accept / Edit / Dismiss buttons; notifications list |
| UI-9 | Members, roles, audit, settings | Forms and tables restyled on the primitives; destructive actions in dialogs |
| UI-10 | Login, welcome, error, loading | Centered glass card, skeleton shimmer (static under reduced motion), plain-English states |
| UI-11 | Polish and audit | Axe pass in e2e for light, dark, reduced-transparency, high-contrast and both languages; performance check (blur layers per screen), remove dead CSS |

## Process
Builder per task, then the Stage 3 reviewer checks code, tests and spec fit, fixes, and merges. Stage 6 runs in parallel and does not restyle; conflicts are expected only in `globals.css` and page markup, so UI tasks rebase on `main` before opening the PR.
