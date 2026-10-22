// Demo project used until the hosted database is set up (backlog task 2), and for demos after.
import type { BoardTask } from "@/domain/board";

export const demoProject = { id: "demo", name: "Line 4 retrofit, Ghent plant" };

export const demoTasks: BoardTask[] = [
  { id: "t1", title: "Lifting permit", status: "done", phase: "Site works", ownerName: "Jonas Peeters", dueDate: "2026-10-27", position: 0 },
  { id: "t2", title: "Lifting works", status: "in_progress", phase: "Site works", ownerName: "Jonas Peeters", dueDate: "2026-11-14", position: 0 },
  { id: "t3", title: "Cabinet drawings", status: "in_progress", phase: "Engineering", ownerName: "Aylin Kaya", dueDate: "2026-11-07", position: 1 },
  { id: "t4", title: "Gearbox delivery", status: "blocked", phase: "Procurement", ownerName: "Marta Silva", dueDate: "2026-11-28", position: 0 },
  { id: "t5", title: "Install gearbox", status: "todo", phase: "Site works", ownerName: "Jonas Peeters", dueDate: "2026-12-05", position: 0 },
  { id: "t6", title: "Electrical tests", status: "todo", phase: "Commissioning", ownerName: "Aylin Kaya", dueDate: "2026-12-08", position: 1 },
];
