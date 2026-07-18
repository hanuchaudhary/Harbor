export function authError(
  set: { status?: number | string },
  error: { status: number; message: string },
) {
  set.status = error.status;
  return { message: error.message };
}

export function forbidden(set: { status?: number | string }) {
  set.status = 403;
  return { message: "Forbidden" };
}

export function notFound(set: { status?: number | string }, message = "Not found") {
  set.status = 404;
  return { message };
}

export function badRequest(
  set: { status?: number | string },
  message: string,
  extra?: Record<string, unknown>,
) {
  set.status = 400;
  return { message, ...extra };
}

export function serverError(set: { status?: number | string }, error?: unknown) {
  console.error(error);
  set.status = 500;
  return { message: "Internal server error" };
}
