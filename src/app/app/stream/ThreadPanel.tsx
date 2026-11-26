import type { ReactNode } from "react";

export type PanelMessage = { id: string; who: string; initial: string; time: string; lines: string[] };
type Props = {
  title: string;
  participants: string;
  createdBy: string;
  creator: string;
  day: string;
  root: PanelMessage;
  replies: PanelMessage[];
  closeHref: string;
  labels: { panel: string; close: string; createdBy: string; replies: string };
  // The reply box.
  children?: ReactNode;
};

const Message = ({ m, cls }: { m: PanelMessage; cls: string }) => (
  <li className={`tp-msg ${cls}`}>
    <span className="tp-av" aria-hidden="true">{m.initial}</span>
    <div>
      <p className="tp-who"><b>{m.who}</b><time>{m.time}</time></p>
      {m.lines.map((l, i) => <p key={i} className="tp-line">{l}</p>)}
    </div>
  </li>
);

// The thread on the right: its title and people, the first message, then the replies.
export function ThreadPanel({ title, participants, createdBy, creator, day, root, replies, closeHref, labels, children }: Props) {
  const [before, after] = labels.replies.replace("{n}", String(replies.length)).split("{who}");
  const [by1, by2] = labels.createdBy.split("{who}");
  return (
    <aside className="thread-panel" aria-label={labels.panel}>
      <header className="tp-head">
        <div>
          <p className="tp-label">{title}</p>
          <p className="tp-sub">{participants}</p>
        </div>
        <a className="tp-close" href={closeHref} aria-label={labels.close} title={labels.close}>
          <svg viewBox="0 0 19 19" width="19" height="19" aria-hidden="true"><path d="M3.96 3.958 15.04 15.042M15.04 3.958 3.96 15.042" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </a>
      </header>
      <div className="tp-intro">
        <span className="tp-art" aria-hidden="true">#</span>
        <h2>{title}</h2>
        <p>{by1}<b>{createdBy}</b>{by2}</p>
      </div>
      <p className="tp-day"><span>{day}</span></p>
      <ol className="tp-list"><Message m={root} cls="tp-root" /></ol>
      {replies.length > 0 && <p className="tp-count">{before}<b>{creator}</b>{after}</p>}
      <ol className="tp-list">{replies.map((m) => <Message key={m.id} m={m} cls="tp-reply" />)}</ol>
      {children}
    </aside>
  );
}
