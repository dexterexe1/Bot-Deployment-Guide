import type { Response } from "express"

export function ok<T>(res: Response, data: T) {
  res.status(200).json({ ok: true, data })
}

export function created<T>(res: Response, data: T) {
  res.status(201).json({ ok: true, data })
}

export function fail(res: Response, status: number, code: string, message: string) {
  const requestId = res.locals.requestId ?? "unknown"
  res.status(status).json({ ok: false, error: { code, message, requestId } })
}

