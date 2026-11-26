import { postMessage } from "./actions";
import { SendButton } from "./SendButton";

// The reply box under a thread: plain words, sent into that thread.
export function ThreadReply({ projectId, threadId, labels }: { projectId: string; threadId: string; labels: { placeholder: string; send: string } }) {
  return (
    <form className="tp-reply" action={postMessage}>
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="thread" value={threadId} />
      <textarea name="body" rows={1} required maxLength={20000} aria-label={labels.placeholder} placeholder={labels.placeholder} />
      <SendButton label={labels.send}>
        <svg viewBox="1343 1109 22 22" width="22" height="22" aria-hidden="true"><path d="M1354 1125.5V1114.5M1358.58 1119.08L1354 1114.5L1349.42 1119.08" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </SendButton>
    </form>
  );
}
