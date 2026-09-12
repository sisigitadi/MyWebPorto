interface ContactPrefillOptions {
  subject: string;
  body: string;
}

export function buildContactPrefillUrl({ subject, body }: ContactPrefillOptions) {
  const params = new URLSearchParams({
    contactSubject: subject,
    contactBody: body,
  });

  return `/?${params.toString()}#kontak`;
}
