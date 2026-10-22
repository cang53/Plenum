import { describe, expect, it, vi } from "vitest";
import { mapEntraUser } from "./entra-map";

function fakes(link: object, verify: object = {}) {
  const generateLink = vi.fn().mockResolvedValue(link);
  const verifyOtp = vi.fn().mockResolvedValue(verify);
  const rpc = vi.fn().mockResolvedValue({});
  return {
    generateLink, verifyOtp, rpc,
    admin: { auth: { admin: { generateLink } } } as never,
    session: { auth: { verifyOtp }, rpc } as never,
  };
}

describe("mapEntraUser", () => {
  it("opens a session for the same email and accepts invitations", async () => {
    const f = fakes({ data: { properties: { hashed_token: "h" } }, error: null });
    expect(await mapEntraUser(" Ann@Example.com ", f.admin, f.session)).toBe(true);
    expect(f.generateLink).toHaveBeenCalledWith({ type: "magiclink", email: "ann@example.com" });
    expect(f.verifyOtp).toHaveBeenCalledWith({ type: "magiclink", token_hash: "h" });
    expect(f.rpc).toHaveBeenCalledWith("accept_my_invitations");
  });

  it("refuses when there is no email, no token or verification fails", async () => {
    const f = fakes({ data: { properties: { hashed_token: "h" } }, error: null }, { error: new Error("x") });
    expect(await mapEntraUser(undefined, f.admin, f.session)).toBe(false);
    expect(await mapEntraUser("a@b.c", f.admin, f.session)).toBe(false);
    const g = fakes({ data: null, error: new Error("x") });
    expect(await mapEntraUser("a@b.c", g.admin, g.session)).toBe(false);
    expect(g.verifyOtp).not.toHaveBeenCalled();
  });
});
