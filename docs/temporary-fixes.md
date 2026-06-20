# Temporary Fixes & Bandaids

This document tracks workarounds and temporary fixes that should be resolved in the future.

## Vite+ × TanStack Start SSR Dev Server

**File:** `apps/web/vite.config.ts` (plugin `tanstackStartViteplusDevSsr()`)

**Problem:** TanStack Start's built-in dev-server plugin uses `instanceof RunnableDevEnvironment` to gate SSR middleware installation. Vite+ (`@voidzero-dev/vite-plus-core`) creates its own environment class, so the `instanceof` check fails and middleware is silently skipped — every dev route returns `"Cannot GET /"`.

**Current fix:** A ~70-line local plugin that duck-types the runner (`typeof ssr.runner?.import === "function"`) instead of relying on the brittle brand check. It mounts the SSR handler ourselves and is a no-op on standard Vite.

**Resolution path:**

1. Wait for TanStack Start's plugin to adopt duck typing or a weaker environment check (likely when/if they update the plugin to better support custom Vite environment implementations)
2. OR upgrade to a future `@voidzero-dev/vite-plus-core` that exports a `RunnableDevEnvironment` class compatible with the one Vite expects
3. When either happens, delete the `tanstackStartViteplusDevSsr()` plugin from `vite.config.ts` and confirm `vp run dev` still serves `/` with SSR

**Marker in code:** search for `tanstackStartViteplusDevSsr` or `# Vite+ × TanStack Start`
