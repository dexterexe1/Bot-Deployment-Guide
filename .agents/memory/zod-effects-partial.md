---
name: ZodEffects partial() bug
description: When .superRefine() is called on a z.object(), it returns ZodEffects which has no .partial() method.
---

## Rule
Never call .partial() on a schema that has .superRefine() applied.

**Why:** .superRefine() wraps in ZodEffects which does not have .partial(). Runtime: "formPayloadSchema.partial is not a function".

**How to apply:**
  const baseSchema = z.object({ ... })
  const fullSchema = baseSchema.superRefine(...)  // for POST (includes cross-field validation)
  const patchSchema = baseSchema.partial()        // for PATCH
