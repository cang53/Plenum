import type { ReactNode } from "react";

// quote: the earlier message this one answers, shown on its own line above the reply with a curved line down to the replier.
export type PanelMessage = { id: string; who: string; initial: string; time: string; lines: string[]; quote?: { who: string; initial: string; text: string }; cards?: ReactNode };
type Props = {
  title: string;
  participants: string;
  createdBy: string;
  day: string;
  root: PanelMessage;
  replies: PanelMessage[];
  closeHref: string;
  labels: { panel: string; close: string; createdBy: string };
  // The reply box.
  children?: ReactNode;
};

const Message = ({ m }: { m: PanelMessage }) => (
  <li className={m.quote ? "tp-msg tp-answer" : "tp-msg"}>
    {m.quote && (
      <p className="tp-replyto">
        <span className="tp-mini" aria-hidden="true">{m.quote.initial}</span>
        <b>{m.quote.who}</b> <span className="tp-excerpt">{m.quote.text}</span>
      </p>
    )}
    <span className="tp-av" aria-hidden="true">{m.initial}</span>
    <div>
      <p className="tp-who"><b>{m.who}</b><time>{m.time}</time></p>
      {m.lines.map((l, i) => <p key={i} className="tp-line">{l}</p>)}
      {m.cards}
    </div>
  </li>
);

// The thread on the right: its title and people, then the first message and the replies as one chat, in time order.
export function ThreadPanel({ title, participants, createdBy, day, root, replies, closeHref, labels, children }: Props) {
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
      <ol className="tp-list">{[root, ...replies].map((m) => <Message key={m.id} m={m} />)}</ol>
      {children}
    </aside>
  );
}
