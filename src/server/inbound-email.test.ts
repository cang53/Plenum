import { describe, expect, it } from "vitest";
import { handleSesNotification, type SesNotification, type StoredEmail } from "./inbound-email";

const rawEmail = [
  "From: Jan Peeters <jan@supplier.example>",
  "To: Pia <pia@example.com>",
  "Cc: line4-ghent@in.plenum.example, bridge-a12@in.plenum.example",
  "Subject: Gearbox delivery",
  "Date: Thu, 22 Oct 2026 08:30:00 +0000",
  "Message-ID: <abc@mail.supplier.example>",
  "MIME-Version: 1.0",
  'Content-Type: multipart/mixed; boundary="b1"',
  "",
  "--b1",
  "Content-Type: text/plain; charset=utf-8",
  "",
  "The gearbox arrives Monday.",
  "--b1",
  'Content-Type: application/pdf; name="delivery-note.pdf"',
  'Content-Disposition: attachment; filename="delivery-note.pdf"',
  "Content-Transfer-Encoding: base64",
  "",
  Buffer.from("%PDF-1.4 test").toString("base64"),
  "--b1--",
  "",
].join("\r\n");

function notification(overrides: Partial<SesNotification["receipt"]> = {}): SesNotification {
  return {
    notificationType: "Received",
    mail: { messageId: "ses-1", timestamp: "2026-10-22T08:30:05.000Z" },
    receipt: {
      recipients: ["line4-ghent@in.plenum.example", "bridge-a12@in.plenum.example"],
      virusVerdict: { status: "PASS" },
      action: { type: "S3", bucketName: "plenum-inbound", objectKey: "emails/ses-1" },
      ...overrides,
    },
  };
}

function deps(knownSlugs: string[]) {
  const stored: StoredEmail[] = [];
  return {
    stored,
    deps: {
      inboundDomain: "in.plenum.example",
      loadRawEmail: async () => Buffer.from(rawEmail),
      storeEmail: async (email: StoredEmail) =>
        knownSlugs.includes(email.emailSlug) ? (stored.push(email), `id-${email.emailSlug}`) : null,
    },
  };
}

describe("handleSesNotification", () => {
  it("stores the email against each project it was sent to, with its attachment", async () => {
    const { stored, deps: d } = deps(["line4-ghent", "bridge-a12"]);
    const result = await handleSesNotification(notification(), d);

    expect(result).toEqual({ stored: ["id-line4-ghent", "id-bridge-a12"], skipped: null });
    expect(stored[0]).toMatchObject({
      emailSlug: "line4-ghent",
      externalId: "<abc@mail.supplier.example>",
      fromName: "Jan Peeters",
      fromAddress: "jan@supplier.example",
      to: ["pia@example.com"],
      cc: ["line4-ghent@in.plenum.example", "bridge-a12@in.plenum.example"],
      subject: "Gearbox delivery",
      sentAt: "2026-10-22T08:30:00.000Z",
      rawLocation: "s3://plenum-inbound/emails/ses-1",
      attachments: [{ partIndex: 0, filename: "delivery-note.pdf", contentType: "application/pdf", sizeBytes: 13 }],
    });
    expect(stored[0].bodyText.trim()).toBe("The gearbox arrives Monday.");
  });

  it("skips addresses with no open project", async () => {
    const { deps: d } = deps([]);
    expect(await handleSesNotification(notification(), d)).toEqual({
      stored: [],
      skipped: "no open project at that address",
    });
  });

  it("never reads mail that was not sent to a project address", async () => {
    const { deps: d } = deps(["line4-ghent"]);
    let loaded = false;
    d.loadRawEmail = async () => ((loaded = true), Buffer.from(rawEmail));
    const result = await handleSesNotification(notification({ recipients: ["pia@example.com"] }), d);
    expect(result.skipped).toBe("no project address");
    expect(loaded).toBe(false);
  });

  it("drops email that failed the virus scan", async () => {
    const { stored, deps: d } = deps(["line4-ghent"]);
    const result = await handleSesNotification(notification({ virusVerdict: { status: "FAIL" } }), d);
    expect(result.skipped).toBe("virus found");
    expect(stored).toHaveLength(0);
  });
});
