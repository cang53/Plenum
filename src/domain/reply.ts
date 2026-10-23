// A reply goes to the message's sender. It is "wider" than the project when that sender is not a member.
export function isWiderAudience(to: string, memberEmails: string[]): boolean {
  const target = to.trim().toLowerCase();
  return !memberEmails.some((e) => e.trim().toLowerCase() === target);
}

export const replySubject = (subject: string | null): string => (/^re:/i.test(subject ?? "") ? subject! : `Re: ${subject || "(no subject)"}`);

// The linked item rides along as a link under the person's text.
export function replyBody(text: string, link?: { title: string; url: string }): string {
  return link ? `${text.trim()}\n\n${link.title}: ${link.url}` : text.trim();
}
