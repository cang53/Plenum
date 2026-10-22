// Rules for email arriving at project addresses such as line4-ghent@in.plenum.example.

const SLUG = /^[a-z0-9][a-z0-9-]{1,62}$/;

// Project slugs among the envelope recipients. Addresses on other domains are ignored,
// so only mail sent to a project is ever read.
export function projectSlugsFor(recipients: string[], inboundDomain: string): string[] {
  const domain = inboundDomain.toLowerCase();
  const slugs = new Set<string>();
  for (const recipient of recipients) {
    const address = recipient.trim().toLowerCase();
    const at = address.lastIndexOf("@");
    if (at < 0 || address.slice(at + 1) !== domain) continue;
    // Plus addressing (slug+anything@) still reaches the project.
    const slug = address.slice(0, at).split("+")[0];
    if (SLUG.test(slug)) slugs.add(slug);
  }
  return [...slugs];
}

// SES receipt rules store the raw email in S3; a notification without that cannot be read back.
export function rawEmailLocation(action: { type?: string; bucketName?: string; objectKey?: string }) {
  if (action.type !== "S3" || !action.bucketName || !action.objectKey) return null;
  return { bucket: action.bucketName, key: action.objectKey };
}
