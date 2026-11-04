import { bestOwner, type Draft, type Person } from "@/domain/planStudio";

export type BaseLoad = Record<string, number[]>;
// The owner the screen suggests with a question; the same rule the server uses.
export const bestOwnerLocal = (st: Draft, steps: Draft[], people: Person[], base: BaseLoad) => bestOwner(st, steps.filter((s) => s.id !== st.id), people, base);
