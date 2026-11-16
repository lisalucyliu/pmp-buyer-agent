// Contact details for the hand-off (row 5, decision 87). Code finds them in the branding description.
// Claude gets only "contact details: yes" or "no", never the details.
// Known limit: code misses formats it doesn't know, for example a phone number or a name with no email.

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/;
// A "#" at the start of a word, then a letter. So "#1 rated" and "C#" are not channels.
const SLACK_CHANNEL = /(?:^|\s)(#[A-Za-z][A-Za-z0-9_-]*)/;

export function findContacts(brandingDescription = '') {
  const email = brandingDescription.match(EMAIL)?.[0] ?? null;
  const slack = brandingDescription.match(SLACK_CHANNEL)?.[1] ?? null;
  return { email, slack };
}

export function hasContacts(brandingDescription = '') {
  const { email, slack } = findContacts(brandingDescription);
  return Boolean(email || slack);
}
