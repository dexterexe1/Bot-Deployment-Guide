import type { RequestHandler } from "express"
import { randomUUID } from "crypto"

export const requestContextMiddleware: RequestHandler = (req, res, next) => {
  const requestId = randomUUID()
  res.locals.requestId = requestId
  res.setHeader("x-request-id", requestId)
  next()
}

