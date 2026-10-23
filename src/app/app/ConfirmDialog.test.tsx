import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { t } from "@/lib/messages";
import { ConfirmDialog } from "./ConfirmDialog";

describe("ConfirmDialog", () => {
  it("renders a labelled dialog with the trigger, the body, the passed form and a cancel button", () => {
    const html = renderToStaticMarkup(
      <ConfirmDialog trigger={t("members.remove")} title={t("members.removeTitle")} body={t("members.removeBody")} cancel={t("link.cancel")}><form>go</form></ConfirmDialog>,
    );
    expect(html).toMatch(/<dialog[^>]*aria-labelledby="([^"]+)"/);
    expect(html).toContain(t("members.removeTitle"));
    expect(html).toContain(t("members.removeBody"));
    expect(html).toContain("<form>go</form>");
    expect(html).toContain(`>${t("link.cancel")}</button>`);
    expect(html).toContain(`>${t("members.remove")}</button>`);
  });
});
