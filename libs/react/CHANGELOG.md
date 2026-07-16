# @tanstack-isomorphic-form/react

## 0.2.2

### Patch Changes

- b863801: Allow `useIsomorphicForm(loaderData, options)` in the React package to accept hook-level `defaultValues`, using those values to seed idle form state for a specific hook instance while preserving the existing sanitizer behavior.
- Updated dependencies [b863801]
  - @tanstack-isomorphic-form/core@0.2.2

## 0.2.1

### Patch Changes

- 2eed09f: Re-export `FormState` from the React package entrypoint so consumers using form loader types in route definitions do not get non-portable inferred type errors that reference internal core package paths.
  - @tanstack-isomorphic-form/core@0.2.1

## 0.2.0

### Minor Changes

- 0b3257e: Re-export `FormActionPanic` from the React package entrypoint so consumers can import it from `@tanstack-isomorphic-form/react`.

### Patch Changes

- @tanstack-isomorphic-form/core@0.2.0

## 0.1.1

### Patch Changes

- 995eaf8: Republish the packages to refresh npm package pages with the latest README and package metadata updates.
- Updated dependencies [995eaf8]
  - @tanstack-isomorphic-form/core@0.1.1
