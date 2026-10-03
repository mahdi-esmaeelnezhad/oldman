export class AppError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function errorResponse(error: unknown): Response {
  if (error instanceof AppError) {
    return Response.json(
      { error: { code: error.code, message: error.message } },
      { status: error.status },
    );
  }

  if (process.env.NODE_ENV !== "production" && error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(error instanceof Error ? error.name : "UnknownError");
  }
  return Response.json(
    { error: { code: "INTERNAL_ERROR", message: "Something went wrong." } },
    { status: 500 },
  );
}

export function json(data: unknown, status = 200): Response {
  return Response.json(data, { status });
}
