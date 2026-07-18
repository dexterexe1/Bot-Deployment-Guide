import { Router } from "express"
import { env } from "../../config/env.js"
import { ok } from "../../utils/respond.js"

const router = Router()

router.get("/", (_req, res) => {
  ok(res, { version: env.DASHBOARD_VERSION })
})

export default router

