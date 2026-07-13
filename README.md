# TanStack Isomorphic Form <!-- omit in toc -->

Progressively enhanced forms for TanStack Start.

This library helps you build forms that work:

- without JavaScript, through normal browser form submission
- with JavaScript, with a smoother client-side submit experience
- with the same validation and action logic in both cases

It is built around an isomorphic form model: keep one form flow, one validation story, and one action contract across server-rendered and client-enhanced usage.

Today, the available package is:

- [`@tanstack-isomorphic-form/react`](./libs/react/README.md)

## Table of Contents <!-- omit in toc -->

- [Features](#features)
- [Packages](#packages)
- [Installation](#installation)
- [Current Example: React Start](#current-example-react-start)
  - [1. Create the server action and form](#1-create-the-server-action-and-form)
  - [2. Use the loader in a route](#2-use-the-loader-in-a-route)
  - [Example Notes](#example-notes)
- [Shared API](#shared-api)
  - [`createIsomorphicForm(options)`](#createisomorphicformoptions)
  - [`redirectAfterAction(options)`](#redirectafteractionoptions)
  - [Common Options](#common-options)
  - [Shared Loader Result](#shared-loader-result)
- [Package Documentation](#package-documentation)
- [Contributing](#contributing)
  - [Development](#development)
  - [Releases](#releases)
- [Status](#status)
- [License](#license)

## Features

- Works with or without JavaScript enabled
- One form flow for server submission and client enhancement
- Shared form contract across framework-specific packages
- Typed values inferred from your schema
- Schema errors and form-level errors exposed separately
- Redirect support after submit

## Packages

- `@tanstack-isomorphic-form/react`: React integration for TanStack Start
- future framework-specific packages are expected to expose the same shared contract

## Installation

```bash
pnpm add @tanstack-isomorphic-form/react
```

## Current Example: React Start

The example below uses `@tanstack-isomorphic-form/react`, which is the current framework package. Future framework packages should follow the same shared contract while exposing their own integration-specific helpers.

### 1. Create the server action and form

```ts
// src/features/todos/todos.form.ts
import { createServerFn } from "@tanstack/react-start";
import { createIsomorphicForm } from "@tanstack-isomorphic-form/react";
import { z } from "zod";

import { createTodo } from "./todos.service.ts";

const todoSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120, "Title is too long"),
});

const createTodoAction = createServerFn({ method: "POST" })
  .validator(todoSchema)
  .handler(async ({ data }) => {
    try {
      return {
        ok: true,
        result: await createTodo(data),
      };
    } catch {
      return {
        ok: false,
        error: "Unable to save the todo. Retry later.",
      };
    }
  });

export const createTodoForm = createIsomorphicForm({
  schema: todoSchema,
  actionFn: createTodoAction,
});
```

### 2. Use the loader in a route

```tsx
// src/routes/todos.tsx
import { createFileRoute } from "@tanstack/react-router";

import { createTodoForm } from "../features/todos/todos.form.ts";

export const Route = createFileRoute("/todos")({
  loader: async (loaderOptions) => ({
    formLoaderData: await createTodoForm.loader(loaderOptions),
  }),
  component: CreateTodoPage,
});

function CreateTodoPage() {
  const { formLoaderData } = Route.useLoaderData();
  const { formProps, formState } = createTodoForm.useIsomorphicForm(formLoaderData);

  const titleError =
    formState.error?.schema?.find((issue) => issue.path?.[0] === "title")?.message ?? null;

  return (
    <main>
      <h1>Add a todo</h1>

      <form {...formProps}>
        <label htmlFor="title">Title</label>
        <input
          id="title"
          name="title"
          defaultValue={formState.values.title ?? ""}
          placeholder="Buy milk"
        />

        {titleError ? <p>{titleError}</p> : null}

        {formState.status === "error" && formState.error?.form ? (
          <p>{String(formState.error.form)}</p>
        ) : null}

        {formState.status === "success" ? <p>Todo created successfully.</p> : null}

        <button type="submit" disabled={formState.status === "pending"}>
          {formState.status === "pending" ? "Saving..." : "Add todo"}
        </button>
      </form>
    </main>
  );
}
```

### Example Notes

- `zod` is used here for schema authoring.
- In a React Start app, `actionFn` should be a `createServerFn`.
- The same form works as a regular HTML form without JavaScript and as an enhanced form when JavaScript is available.
- The React-specific hook shown here is package-specific, while the loader/action contract is intended to stay shared.

## Shared API

### `createIsomorphicForm(options)`

Creates a form definition around a shared cross-package contract.

Across framework packages, it returns:

- `loader`: reads the request, runs validation and the action on `POST`, and returns a typed form state

Framework packages can also return integration-specific helpers.

For example:

- `@tanstack-isomorphic-form/react` also returns `useIsomorphicForm`

### `redirectAfterAction(options)`

Helper for returning a redirect from your action while preserving the form action result shape.

### Common Options

- `schema`: required form schema
- `actionFn`: server action used by the framework integration
- `defaultValues`: optional initial values
- `formDataOptions`: optional parsing delimiters for nested keys
- `returnedValueSanitizer`: optional function to normalize values stored in form state

Some framework packages may add more options when needed, while the shared options stay aligned.

### Shared Loader Result

The shared loader result is designed around these states:

- `idle`
- `pending`
- `success`
- `error`

The form state includes:

- `values`: the extracted form values
- `result`: present after a successful action
- `error.schema`: schema validation issues
- `error.form`: form-level action error or unexpected error

Nested objects and arrays are extracted from `FormData` key names. By default, these delimiters are used:

- object properties: `.`
- array indexes: `[` and `]`

Examples:

- `title`
- `address.street`
- `items[0].label`

Unexpected thrown errors are wrapped as `FormActionPanic`.

## Package Documentation

- React package guide: [`libs/react/README.md`](./libs/react/README.md)
- Core package overview: [`libs/core/README.md`](./libs/core/README.md)

## Contributing

Contributor workflows and release expectations are documented below.

### Development

```bash
pnpm install
pnpm check
pnpm fix
```

### Releases

This repository uses Changesets for versioning and npm publication.

For any package-affecting change:

```bash
pnpm changeset
```

Choose the correct bump type:

- `patch` for fixes
- `minor` for backward-compatible features
- `major` for breaking changes

The CI workflow then enforces:

- `pnpm check` passes
- `pnpm build` passes
- both packages keep the same version number

Pull requests should use the Changesets GitHub app for changeset guidance:

- install `changeset-bot` on the repository
- the bot comments when a PR may need a changeset
- if the PR affects a release, run `pnpm changeset`

On every push to `main`, GitHub Actions runs Changesets:

- if unreleased changesets exist, it opens or updates a release PR
- merging that PR creates the git tag and publishes both packages to npm

Repository setup still required:

- configure a GitHub Actions environment named `release` and add the desired protection rules
- configure npm trusted publishing for each package with the `release.yml` GitHub Actions workflow and the `release` environment name
- install the `changeset-bot` GitHub app on this repository
- allow GitHub Actions to create pull requests if your repository settings restrict that

## Status

This repository is still early-stage. Expect the public API and packaging details to evolve.

## License

`MIT`
