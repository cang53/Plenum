// The line under a message that started a thread: who joined, how many messages, and a link that opens the thread.
export function ThreadChip({ href, count, countLabel, viewLabel, initials }: { href: string; count: number; countLabel: string; viewLabel: string; initials: string[] }) {
  return (
    <div className="tc-row">
      <a className="thread-chip" href={href}>
        <span className="tc-avatars" aria-hidden="true">{initials.slice(0, 3).map((c, i) => <span key={i} className="tc-av">{c}</span>)}</span>
        <b>{countLabel.replace("{n}", String(count))}</b> <span>{viewLabel}</span>
      </a>
    </div>
  );
}
