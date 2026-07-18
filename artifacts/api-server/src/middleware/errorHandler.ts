import type { ErrorRequestHandler } from "express"
import { ZodError } from "zod"
import { ApiError } from "../utils/apiError.js"
import { fail } from "../utils/respond.js"

export const errorHandlerMiddleware: ErrorRequestHandler = (err, _req, res, _next) => {
  void _next
  if (err instanceof ZodError) {
    return fail(res, 400, "VALIDATION_ERROR", "Invalid request")
  }

  if (err instanceof ApiError) {
    return fail(res, err.status, err.code, err.message)
  }

  return fail(res, 500, "INTERNAL_ERROR", "Internal server error")
}
