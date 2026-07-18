import mongoose from "mongoose"

const SiteSettingsSchema = new mongoose.Schema(
  {
    _id: { type: String, default: "global" },
    cursor: {
      enabled: { type: Boolean, default: true },
      type: {
        type: String,
        enum: ["bunny", "bunny-glow", "bunny-large", "default"],
        default: "bunny-glow",
      },
      color: { type: String, default: "rgba(168, 85, 247, 0.92)" },
    },
  },
  { timestamps: true },
)

export const SiteSettingsModel = mongoose.model("SiteSettings", SiteSettingsSchema)

export const DEFAULT_SITE_SETTINGS = {
  cursor: {
    enabled: true,
    type: "bunny-glow" as const,
    color: "rgba(168, 85, 247, 0.92)",
  },
}
