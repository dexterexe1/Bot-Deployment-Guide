---
name: CinematicBackground infinite loop
description: Inline object spread in render body causes useEffect to re-fire on every render.
---

## Rule
Never use a plain object/array created inline in the render function as a useEffect dependency.

**Why:** Each render creates a new object reference; useEffect compares by reference so it re-fires, calling setState, causing re-render, infinite loop.

**How to apply:**
  const bgConfig = useMemo(
    () => ({ ...DEFAULT_BACKGROUND_CONFIG, ...config }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(config)],
  )
