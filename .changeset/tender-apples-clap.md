---
"@tanstack-isomorphic-form/react": patch
---

Re-export `FormState` from the React package entrypoint so consumers using form loader types in route definitions do not get non-portable inferred type errors that reference internal core package paths.
