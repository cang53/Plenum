// Demo project used until the hosted database is set up (backlog task 2), and for demos after.
import type { BoardTask, TaskStatus } from "@/domain/board";
import type { GanttTask } from "@/domain/gantt";
import type { Dependency } from "@/domain/schedule";
import type { TimelineMessage } from "@/domain/timeline";

import type { StoredSuggestion } from "@/domain/triage";
export const demoProject = { id: "demo", name: "Line 4 retrofit, Ghent plant", timeZone: "Europe/Brussels" };

export const demoTasks: BoardTask[] = [
  { id: "t1", number: 1, title: "Lifting permit", status: "done", phase: "Site works", ownerName: "Jonas Peeters", dueDate: "2026-10-27", priority: "low", position: 0, site: "Rotterdam yard" },
  { id: "t2", number: 2, title: "Lifting works", status: "in_progress", phase: "Site works", ownerName: "Jonas Peeters", dueDate: "2026-11-14", priority: "high", position: 0, site: "Rotterdam yard" },
  { id: "t3", number: 3, title: "Cabinet drawings", status: "in_progress", phase: "Engineering", ownerName: "Aylin Kaya", dueDate: "2026-11-07", priority: "normal", position: 1, site: null },
  { id: "t4", number: 4, title: "Gearbox delivery", status: "blocked", phase: "Procurement", ownerName: "Marta Silva", dueDate: "2026-11-28", priority: "high", position: 0, site: null, waitingOn: "Re: Gearbox shipping date" },
  { id: "t5", number: 5, title: "Install gearbox", status: "todo", phase: "Site works", ownerName: "Jonas Peeters", dueDate: "2026-12-05", priority: "normal", position: 0, site: "Antwerp works" },
  { id: "t6", number: 6, title: "Electrical tests", status: "todo", phase: "Commissioning", ownerName: "Aylin Kaya", dueDate: "2026-12-08", priority: "low", position: 1, site: null },
];

// Demo emails, dated relative to now so the timeline always shows today and recent days.
export function demoMessages(now: Date): TimelineMessage[] {
  const ago = (hours: number) => new Date(now.getTime() - hours * 3_600_000).toISOString();
  const email = (id: string, hours: number, fromName: string, fromAddress: string, subject: string, bodyText: string) => ({
    id, source: "email" as const, fromName, fromAddress, subject, bodyText, receivedAt: ago(hours), attachments: [],
  });
  return [
    email("m1", 1, "Marta Silva", "marta.silva@supplier.example", "Gearbox delivery date",
      "The supplier confirms the gearbox delivery slips from 14 Nov to 28 Nov. Can we resequence the install?"),
    { id: "m5", source: "app" as const, fromName: "Maya de Vries", fromAddress: "maya@plenum.example", subject: "Re: Gearbox delivery date", bodyText: "Thanks Marta. Let's resequence: electrical tests first, gearbox install after 28 Nov.", receivedAt: ago(0.5), attachments: [{ id: "a4", filename: "site-photo-crane.svg", contentType: "image/png", sizeBytes: 182_000 }, { id: "a5", filename: "install-sequence-v2.pdf", contentType: "application/pdf", sizeBytes: 640_000 }] },
    { id: "m6", source: "teams" as const, fromName: "Aylin Kaya", fromAddress: "aylin.kaya@electrical.example", subject: "", bodyText: "Cabinet drawings are on the share. Can someone confirm revision B is the one we build from?", receivedAt: ago(0.8), attachments: [] },
    email("m2", 3, "Jonas Peeters", "jonas.peeters@plant.example", "Vergunning hijswerk",
      "Vergunning voor hijswerk is goedgekeurd, we kunnen maandag starten."),
    {
      ...email("m3", 26, "Aylin Kaya", "aylin.kaya@electrical.example", "Cabinet drawings",
        "I need the updated cabinet drawings before Thursday to finish the wiring plans. Attached are my comments on revision A."),
      attachments: [{ id: "a1", filename: "cabinet-rev-A-comments.pdf", contentType: "application/pdf", sizeBytes: 482_000 }],
    },
    {
      ...email("m4", 74, "Jonas Peeters", "jonas.peeters@plant.example", "Lifting plan for line 4",
        "Hi all,\n\nHere is the lifting plan for the gearbox and the motor. The crane arrives at gate 3 at 07:00 and needs the area " +
        "between hall B and the warehouse kept clear from 06:30. Forklift traffic is rerouted through gate 5 for the day.\n\n" +
        "Please check the load chart on page 4 against the final gearbox weight from the supplier, and tell me before Friday if " +
        "anything changes. The permit request goes to the safety office on Monday.\n\nThanks,\nJonas"),
      attachments: [
        { id: "a2", filename: "lifting-plan-L4.pdf", contentType: "application/pdf", sizeBytes: 1_420_000 },
        { id: "a3", filename: "site-photo-gate-3.jpg", contentType: "image/jpeg", sizeBytes: 236_000 },
      ],
    },
  ];
}

// Example AI suggestions for the demo emails (stored ones would come from public.suggestions).
export const demoSuggestions: StoredSuggestion[] = [
  { id: "s1", messageId: "m1", status: "pending", kind: "change_request", title: "Resequence install after gearbox delay", details: "Delivery moves from 14 Nov to 28 Nov, so the install needs a new slot.", reason: "The supplier's email moves the gearbox delivery by two weeks." },
  { id: "s2", messageId: "m3", status: "pending", kind: "task", title: "Send updated cabinet drawings to Aylin", details: "Needed before Thursday to finish the wiring plans.", reason: "Aylin asks for the drawings before Thursday." },
];

// Demo plan for the Timeline: dates are offsets from the Monday on or before eight days ago, so Today always sits in the first weeks.
export function demoGantt(now: Date): { tasks: GanttTask[]; dependencies: Dependency[]; start: string } {
  const day = Math.floor(now.getTime() / 86_400_000) - 8;
  const monday = day - ((day + 3) % 7); // day 0 of the epoch was a Thursday
  const iso = (offset: number) => new Date((monday + offset) * 86_400_000).toISOString().slice(0, 10);
  const task = (n: number, title: string, phase: string, from: number, to: number, ownerName: string, status: TaskStatus, priority: "low" | "normal" | "high", extra: Partial<GanttTask> = {}): GanttTask =>
    ({ id: `g${n}`, number: n, title, phase, startDate: iso(from), dueDate: iso(to), ownerName, status, priority, ...extra });
  const forecast = iso(22);
  return {
    start: iso(0),
    tasks: [
      task(3, "Cabinet drawings", "Engineering", 0, 3, "Aylin Kaya", "done", "normal"),
      task(7, "Load chart check", "Engineering", 0, 4, "Jonas Peeters", "in_progress", "high"),
      task(4, "Order gearbox", "Procurement", 1, 7, "Marta Silva", "done", "normal"),
      task(5, "Gearbox delivery", "Procurement", 8, 16, "Marta Silva", "blocked", "high", { forecast: { date: forecast, label: `Supplier forecast ${new Intl.DateTimeFormat("en", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${forecast}T00:00:00Z`))}, not accepted` } }),
      task(1, "Lifting permit", "Permits", 0, 2, "Jonas Peeters", "done", "low"),
      task(8, "Foundation check", "Site prep", 8, 11, "Jonas Peeters", "in_progress", "normal"),
      task(2, "Lifting works", "Site works", 3, 24, "Jonas Peeters", "in_progress", "high"),
      task(9, "Crane inspection", "Site works", 25, 32, "Jonas Peeters", "todo", "normal"),
      task(10, "Install gearbox", "Site works", 25, 30, "Marta Silva", "todo", "normal"),
      task(6, "Electrical tests", "Commissioning", 33, 36, "Aylin Kaya", "todo", "low"),
    ],
    dependencies: [
      { predecessorId: "g4", successorId: "g5" },
      { predecessorId: "g1", successorId: "g2" },
      { predecessorId: "g7", successorId: "g2" },
      { predecessorId: "g2", successorId: "g9" },
      { predecessorId: "g5", successorId: "g10" },
      { predecessorId: "g9", successorId: "g6" },
      { predecessorId: "g10", successorId: "g6" },
    ],
  };
}
