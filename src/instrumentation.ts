// Next.js calls this for every unhandled server error (render, route, action).
export async function onRequestError(error: unknown, request: { path: string }): Promise<void> {
  const { reportError } = await import("@/lib/error-sink");
  await reportError(`server error ${request.path.split("?")[0]}`, error);
}
