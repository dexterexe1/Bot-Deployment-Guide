import { randomUUID } from "crypto"
import type { SessionUser } from "../../shared/types.js"
import { ApplicationLogModel } from "../models/ApplicationLog.js"
import { ApplicationSubmissionModel } from "../models/ApplicationSubmission.js"

type LogInput = {
  guildId: string
  formId?: string | null
  submissionId?: string | null
  type: "submitted" | "status_changed" | "note_added" | "note_deleted" | "reviewed" | "form_updated" | "panel_deployed"
  message: string
  actor?: SessionUser | null
  metadata?: Record<string, string | number | boolean | null>
}

export async function appendApplicationLog(input: LogInput) {
  await ApplicationLogModel.create({
    guildId: input.guildId,
    formId: input.formId ?? null,
    submissionId: input.submissionId ?? null,
    type: input.type,
    message: input.message,
    actor: input.actor ?? null,
    metadata: input.metadata ?? {},
    createdAt: new Date(),
  })
}

export async function appendSubmissionHistory(
  submissionId: string,
  input: Omit<LogInput, "submissionId" | "guildId" | "formId">,
) {
  await ApplicationSubmissionModel.findByIdAndUpdate(submissionId, {
    $push: {
      history: {
        id: randomUUID(),
        type: input.type,
        message: input.message,
        createdAt: new Date(),
        actor: input.actor ?? null,
        metadata: input.metadata ?? {},
      },
    },
  })
}
