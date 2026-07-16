---
"@tanstack-isomorphic-form/core": patch
"@tanstack-isomorphic-form/react": patch
---

Allow `useIsomorphicForm(loaderData, options)` in the React package to accept hook-level `defaultValues`, using those values to seed idle form state for a specific hook instance while preserving the existing sanitizer behavior.
