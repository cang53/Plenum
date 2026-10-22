import { createVerify } from "node:crypto";

// An Amazon SNS message as posted to an HTTPS subscription.
export type SnsMessage = {
  Type: "Notification" | "SubscriptionConfirmation" | "UnsubscribeConfirmation";
  MessageId: string;
  TopicArn: string;
  Message: string;
  Timestamp: string;
  Signature: string;
  SignatureVersion: string;
  SigningCertURL: string;
  Subject?: string;
  SubscribeURL?: string;
  Token?: string;
};

// SNS certificates and confirmation links are only ever served from sns.<region>.amazonaws.com.
export function isSnsUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && /^sns\.[a-z0-9-]+\.amazonaws\.com$/.test(url.hostname);
  } catch {
    return false;
  }
}

// The exact text SNS signs, as documented for each message type.
export function stringToSign(message: SnsMessage): string {
  const keys =
    message.Type === "Notification"
      ? (["Message", "MessageId", "Subject", "Timestamp", "TopicArn", "Type"] as const)
      : (["Message", "MessageId", "SubscribeURL", "Timestamp", "Token", "TopicArn", "Type"] as const);
  return keys
    .filter((key) => message[key] !== undefined)
    .map((key) => `${key}\n${message[key]}\n`)
    .join("");
}

export async function verifySnsMessage(
  message: SnsMessage,
  fetchCertificate: (url: string) => Promise<string>,
): Promise<boolean> {
  if (!isSnsUrl(message.SigningCertURL) || !message.SigningCertURL.endsWith(".pem")) return false;
  const algorithm = message.SignatureVersion === "2" ? "RSA-SHA256" : message.SignatureVersion === "1" ? "RSA-SHA1" : null;
  if (!algorithm) return false;
  const certificate = await fetchCertificate(message.SigningCertURL);
  try {
    return createVerify(algorithm).update(stringToSign(message)).verify(certificate, message.Signature, "base64");
  } catch {
    return false;
  }
}

const certificates = new Map<string, Promise<string>>();

export function fetchCertificateCached(url: string): Promise<string> {
  let pending = certificates.get(url);
  if (!pending) {
    pending = fetch(url).then((response) => {
      if (!response.ok) throw new Error(`SNS certificate fetch failed: ${response.status}`);
      return response.text();
    });
    pending.catch(() => certificates.delete(url));
    certificates.set(url, pending);
  }
  return pending;
}
