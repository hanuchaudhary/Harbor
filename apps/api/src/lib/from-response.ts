/** Unwrap a Fetch Response for Elysia handlers. */
export async function fromResponse(set: { status?: number | string }, res: Response) {
  set.status = res.status;
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
