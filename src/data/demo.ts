// Demo project used until the hosted database is set up (backlog task 2), and for demos after.
import type { BoardTask } from "@/domain/board";
import type { TimelineMessage } from "@/domain/timeline";

export const demoProject = { id: "demo", name: "Line 4 retrofit, Ghent plant", timeZone: "Europe/Brussels" };

export const demoTasks: BoardTask[] = [
  { id: "t1", title: "Lifting permit", status: "done", phase: "Site works", ownerName: "Jonas Peeters", dueDate: "2026-10-27", position: 0 },
  { id: "t2", title: "Lifting works", status: "in_progress", phase: "Site works", ownerName: "Jonas Peeters", dueDate: "2026-11-14", position: 0 },
  { id: "t3", title: "Cabinet drawings", status: "in_progress", phase: "Engineering", ownerName: "Aylin Kaya", dueDate: "2026-11-07", position: 1 },
  { id: "t4", title: "Gearbox delivery", status: "blocked", phase: "Procurement", ownerName: "Marta Silva", dueDate: "2026-11-28", position: 0 },
  { id: "t5", title: "Install gearbox", status: "todo", phase: "Site works", ownerName: "Jonas Peeters", dueDate: "2026-12-05", position: 0 },
  { id: "t6", title: "Electrical tests", status: "todo", phase: "Commissioning", ownerName: "Aylin Kaya", dueDate: "2026-12-08", position: 1 },
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
