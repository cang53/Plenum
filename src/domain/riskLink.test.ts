import { describe, expect, it } from "vitest";
import { extractDate, suggestTask } from "./riskLink";

const tasks = [{ id: "a", title: "Order conveyor delivery" }, { id: "b", title: "Prepare floor" }, { id: "c", title: "PLC programming" }];
describe("suggestTask", () => {
  it("picks the activity the text is about", () => {
    expect(suggestTask({ title: "Conveyor delivery could be delayed", details: "" }, tasks)?.id).toBe("a");
    expect(suggestTask({ title: "Floor not ready", details: "The floor preparation slips" }, tasks)?.id).toBe("b");
  });
  it("suggests nothing when nothing matches", () => {
    expect(suggestTask({ title: "Weather", details: "Rain in winter" }, tasks)).toBeNull();
  });
});
describe("extractDate", () => {
  it("reads ISO, day-month, month-day and week forms", () => {
    expect(extractDate("Supplier closes on 2026-12-03", "2026-11-05")).toBe("2026-12-03");
    expect(extractDate("deadline 3 December", "2026-11-05")).toBe("2026-12-03");
    expect(extractDate("by Dec 3rd", "2026-11-05")).toBe("2026-12-03");
    expect(extractDate("crane is booked in week 49", "2026-11-05")).toBe("2026-11-30");
  });
  it("rolls a past date to next year and returns null with no date", () => {
    expect(extractDate("on 10 January", "2026-11-05")).toBe("2027-01-10");
    expect(extractDate("no date here", "2026-11-05")).toBeNull();
  });
});
