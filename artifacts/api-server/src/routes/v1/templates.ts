import { Router } from "express"
import { z } from "zod"
import { requireAuth } from "../../middleware/requireAuth.js"
import ServerTemplate from "../../models/ServerTemplate.js"
import { ok } from "../../utils/respond.js"

const router = Router()

const templateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  theme: z.object({
    primaryColor: z.string().optional(),
    secondaryColor: z.string().optional(),
    accentColor: z.string().optional(),
    themePreset: z.string().optional(),
  }),
  mascot: z.object({
    enabled: z.boolean(),
    style: z.string().optional(),
    color: z.string().optional(),
    glowColor: z.string().optional(),
    animations: z.object({
      breathing: z.boolean(),
      blinking: z.boolean(),
      earMovement: z.boolean(),
      hopping: z.boolean(),
      particles: z.boolean(),
    }),
  }),
  enabledModules: z.object({
    moderation: z.boolean(),
    tickets: z.boolean(),
    applications: z.boolean(),
    logging: z.boolean(),
    welcome: z.boolean(),
    reactionRoles: z.boolean(),
    leveling: z.boolean(),
    music: z.boolean(),
    autoResponses: z.boolean(),
    customCommands: z.boolean(),
  }),
})

const templateQuerySchema = z.object({
  guildId: z.string().trim().min(1).optional(),
})

router.use(requireAuth)

router.get("/", async (req, res, next) => {
  try {
    const { guildId } = templateQuerySchema.parse(req.query)

    let templates
    if (guildId) {
      templates = await ServerTemplate.find({
        $or: [
          { isPublic: true },
          { guildId },
        ],
      })
    } else {
      templates = await ServerTemplate.find({ isPublic: true })
    }

    ok(res, { templates })
  } catch (err) {
    next(err)
  }
})

router.get("/:templateId", async (req, res, next) => {
  try {
    const template = await ServerTemplate.findById(req.params.templateId)
    if (!template) {
      res.status(404).json({ ok: false, error: { code: "TEMPLATE_NOT_FOUND", message: "Template not found", requestId: res.locals.requestId ?? "unknown" } })
      return
    }

    ok(res, { template })
  } catch (err) {
    next(err)
  }
})

router.post("/", async (req, res, next) => {
  try {
    const payload = templateSchema.parse(req.body)

    const template = await ServerTemplate.create({
      ...payload,
      guildId: req.body.guildId || undefined,
      isPublic: req.body.isPublic ?? false,
    })

    ok(res, { template, message: "Template created successfully" })
  } catch (err) {
    next(err)
  }
})

router.put("/:templateId", async (req, res, next) => {
  try {
    const payload = templateSchema.partial().parse(req.body)

    const template = await ServerTemplate.findByIdAndUpdate(
      req.params.templateId,
      { ...payload, updatedAt: new Date() },
      { new: true },
    )

    if (!template) {
      res.status(404).json({ ok: false, error: { code: "TEMPLATE_NOT_FOUND", message: "Template not found", requestId: res.locals.requestId ?? "unknown" } })
      return
    }

    ok(res, { template, message: "Template updated successfully" })
  } catch (err) {
    next(err)
  }
})

router.delete("/:templateId", async (req, res, next) => {
  try {
    const template = await ServerTemplate.findByIdAndDelete(req.params.templateId)

    if (!template) {
      res.status(404).json({ ok: false, error: { code: "TEMPLATE_NOT_FOUND", message: "Template not found", requestId: res.locals.requestId ?? "unknown" } })
      return
    }

    ok(res, { message: "Template deleted successfully" })
  } catch (err) {
    next(err)
  }
})

export default router
