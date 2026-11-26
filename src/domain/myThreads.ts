export type MyThread = { id: string; title: string; roomId: string; roomName: string; roomEmoji: string; replies: number; lastAt: string };

type ThreadRow = { id: string; title: string; chatroomId: string; createdAt: string };
type RoomRow = { id: string; name: string; emoji: string };
type ReplyRow = { threadId: string; receivedAt: string };

// The threads a person has written in, most recently active first. A thread with no replies counts its own start as its last activity.
export function summarizeThreads(threads: ThreadRow[], rooms: RoomRow[], replies: ReplyRow[]): MyThread[] {
  return threads
    .map((t) => {
      const mine = replies.filter((r) => r.threadId === t.id);
      const room = rooms.find((r) => r.id === t.chatroomId);
      return { id: t.id, title: t.title, roomId: t.chatroomId, roomName: room?.name ?? "", roomEmoji: room?.emoji ?? "", replies: mine.length, lastAt: mine.map((r) => r.receivedAt).sort().at(-1) ?? t.createdAt };
    })
    .sort((a, b) => b.lastAt.localeCompare(a.lastAt) || a.title.localeCompare(b.title));
}
