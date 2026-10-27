import type { MessageKey } from "@/lib/messages";

// What the save button reports back to the inspector. "conflict" carries the latest saved text so nothing typed is lost.
export type SaveResult =
  | { status: "idle" }
  | { status: "invalid"; message: Extract<MessageKey, `items.err.${string}`> }
  | { status: "error" }
  | { status: "conflict"; latest: { title: string; details: string } };

// A cheap fingerprint of what a person was looking at; if it differs when they save, someone else saved first.
export const itemVersion = (i: { title: string; details: string; status?: string | null }): string => JSON.stringify([i.title, i.details, i.status ?? ""]);

export const SAVED_PARAM = /^(task|decision|risk):[0-9a-f-]{36}$/i;
