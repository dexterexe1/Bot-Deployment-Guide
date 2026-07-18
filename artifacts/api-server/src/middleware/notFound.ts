import type { NextFunction } from "express"
import { ApiError } from "../utils/apiError.js"

export function notFoundMiddleware(next: NextFunction) {
  next(new ApiError(404, "NOT_FOUND", "Route not found"))
}

