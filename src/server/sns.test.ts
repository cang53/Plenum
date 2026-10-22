import { createSign, generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { isSnsUrl, stringToSign, verifySnsMessage, type SnsMessage } from "./sns";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const publicPem = publicKey.export({ type: "spki", format: "pem" }).toString();

function signed(overrides: Partial<SnsMessage> = {}): SnsMessage {
  const message: SnsMessage = {
    Type: "Notification",
    MessageId: "m-1",
    TopicArn: "arn:aws:sns:eu-west-1:123456789012:plenum-inbound",
    Message: '{"notificationType":"Received"}',
    Timestamp: "2026-10-22T09:00:00.000Z",
    SignatureVersion: "2",
    SigningCertURL: "https://sns.eu-west-1.amazonaws.com/SimpleNotificationService-abc.pem",
    Signature: "",
    ...overrides,
  };
  message.Signature = createSign("RSA-SHA256").update(stringToSign(message)).sign(privateKey, "base64");
  return message;
}

describe("stringToSign", () => {
  it("lists notification fields in the documented order and skips a missing subject", () => {
    expect(stringToSign(signed())).toBe(
      "Message\n{\"notificationType\":\"Received\"}\nMessageId\nm-1\nTimestamp\n2026-10-22T09:00:00.000Z\n" +
        "TopicArn\narn:aws:sns:eu-west-1:123456789012:plenum-inbound\nType\nNotification\n",
    );
  });
});

describe("verifySnsMessage", () => {
  const fetchCert = async () => publicPem;

  it("accepts a correctly signed message", async () => {
    expect(await verifySnsMessage(signed(), fetchCert)).toBe(true);
  });

  it("rejects a message changed after signing", async () => {
    const message = signed();
    message.Message = '{"notificationType":"Forged"}';
    expect(await verifySnsMessage(message, fetchCert)).toBe(false);
  });

  it("never fetches a certificate from outside SNS", async () => {
    let fetched = false;
    const message = signed({ SigningCertURL: "https://attacker.example/cert.pem" });
    expect(await verifySnsMessage(message, async () => ((fetched = true), publicPem))).toBe(false);
    expect(fetched).toBe(false);
  });
});

describe("isSnsUrl", () => {
  it("allows only https links on sns.<region>.amazonaws.com", () => {
    expect(isSnsUrl("https://sns.eu-central-1.amazonaws.com/?Action=ConfirmSubscription")).toBe(true);
    expect(isSnsUrl("http://sns.eu-central-1.amazonaws.com/")).toBe(false);
    expect(isSnsUrl("https://sns.eu-central-1.amazonaws.com.evil.example/")).toBe(false);
    expect(isSnsUrl(undefined)).toBe(false);
  });
});
