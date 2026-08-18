---
name: TanStack Query auth error handling
description: How to configure QueryClient to not retry on 401/403 and redirect to login immediately
---

# TanStack Query — auth error retry fix

## Rule
Configure QueryClient with a `retry` function that returns `false` for 401/403 status codes. Without this, TanStack Query retries failed auth checks 3 times by default, keeping `isLoading: true` for several seconds and blocking the redirect to the login page.

**Why:** The generated Orval hooks throw errors with a `.status` property on 4xx. The default retry policy (3 retries) treats auth failures the same as network errors, so the "loading" state persists until all retries are exhausted before `data` becomes `undefined` and the redirect fires.

**How to apply:** Set this on the shared `QueryClient` instance in `App.tsx`:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: unknown) => {
        const status = (error as { status?: number })?.status;
        if (status === 401 || status === 403) return false;
        return failureCount < 2;
      },
    },
  },
});
```
