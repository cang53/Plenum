import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("./actions", () => ({ postMessage: async () => {} }));
import { ThreadReply } from "./ThreadReply";

describe("ThreadReply", () => {
  it("sends the words into that thread of that project", () => {
    const html = renderToStaticMarkup(<ThreadReply projectId="p1" threadId="t1" labels={{ placeholder: "Reply in thread", send: "Send" }} />);
    expect(html).toContain('name="projectId" value="p1"');
    expect(html).toContain('name="thread" value="t1"');
    expect(html).toContain('aria-label="Reply in thread"');
    expect(html).toContain('aria-label="Send"');
  });
});
