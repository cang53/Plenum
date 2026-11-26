import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ThreadChip } from "./ThreadChip";
import { ThreadPanel } from "./ThreadPanel";

const labels = { panel: "Thread", close: "Close thread", createdBy: "Created by {who}" };
const m = (id: string, who: string) => ({ id, who, initial: who[0], time: "24m", lines: ["Hi"] });

describe("ThreadChip", () => {
  it("links to the thread with the message count and the first initials", () => {
    const html = renderToStaticMarkup(<ThreadChip href="/x" count={3} countLabel="{n} Messages" viewLabel="View threads" initials={["B", "A"]} />);
    expect(html).toContain('href="/x"');
    expect(html).toContain("<b>3 Messages</b>");
    expect(html).toContain("View threads");
  });
});

describe("ThreadPanel", () => {
  it("shows the title, who started it, then the first message and the replies in one list", () => {
    const html = renderToStaticMarkup(<ThreadPanel title="Gearbox delay" participants="A, B" createdBy="Brandon" day="July 10" root={m("1", "Brandon")} replies={[m("2", "Alfonso"), m("3", "Kaiya")]} closeHref="/back" labels={labels}>reply box</ThreadPanel>);
    expect(html).toContain("<h2>Gearbox delay</h2>");
    expect(html).toContain("Created by <b>Brandon</b>");
    expect(html.match(/class="tp-msg"/g)).toHaveLength(3);
    expect(html.indexOf("Brandon</b><time")).toBeLessThan(html.indexOf("Alfonso"));
    expect(html).toContain('href="/back"');
    expect(html).toContain("reply box");
  });
  it("quotes the message a reply answers, like replies in the main chat", () => {
    const html = renderToStaticMarkup(<ThreadPanel title="T" participants="" createdBy="B" day="d" root={m("1", "B")} replies={[{ ...m("2", "A"), quote: { who: "B", text: "Hi" } }]} closeHref="/" labels={labels} />);
    expect(html).toContain('<p class="tp-quote"><b>B</b> Hi</p>');
  });
});
