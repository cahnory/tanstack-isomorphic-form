# TanStack Isomorphic Form <!-- omit in toc -->

Progressively enhanced forms for `@tanstack/react-start`.

This library helps you build forms that work:

- without JavaScript, through normal browser form submission
- with JavaScript, with a smoother client-side submit experience
- with the same validation and action logic in both cases

For `@tanstack/react-start`, `actionFn` should be a `createServerFn` server function. That keeps form submission working in both the server-rendered and client-enhanced flows.

The React package currently exposes:

- `createIsomorphicForm`
- `redirectAfterAction`

Under the hood, the form schema must implement both `StandardSchemaV1` and `StandardJSONSchemaV1`. The example below uses `zod`, but the library works with any schema library or adapter that satisfies those two interfaces.

## Table of Contents <!-- omit in toc -->

- [Features](#features)
- [Installation](#installation)
- [Example](#example)
  - [1. Create the server action and form](#1-create-the-server-action-and-form)
  - [2. Use the loader in a React Start route](#2-use-the-loader-in-a-react-start-route)
  - [Example Notes](#example-notes)
- [API](#api)
  - [`createIsomorphicForm(options)`](#createisomorphicformoptions)
  - [`redirectAfterAction(options)`](#redirectafteractionoptions)
  - [Options](#options)
  - [`formState`](#formstate)
- [Form Field Naming](#form-field-naming)
- [Error Handling](#error-handling)
- [Contributing](#contributing)
  - [Development](#development)
  - [Releases](#releases)
- [Status](#status)
- [License](#license)

## Features

- Works with or without JavaScript enabled
- One form flow for server submission and client enhancement
- Typed values inferred from your schema
- Schema errors and form-level errors exposed separately
- Redirect support after submit

## Installation

```bash
pnpm add @tanstack-isomorphic-form/react
```

## Example

The example below shows the full flow for a simple todo creation form in `@tanstack/react-start`.

### 1. Create the server action and form

```ts
// src/features/todos/todos.form.ts
import { createServerFn } from "@tanstack/react-start";
import { createIsomorphicForm } from "@tanstack-isomorphic-form/react";
import { z } from "zod";

import { createTodo } from "./todos.service.ts";

// Define the form schema.
const todoSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120, "Title is too long"),
});

// Create the server action used by both the server-rendered and client-enhanced flows.
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

// Bind the schema and action together.
export const createTodoForm = createIsomorphicForm({
  schema: todoSchema,
  actionFn: createTodoAction,
});
```

### 2. Use the loader in a React Start route

```tsx
// src/routes/todos.tsx
import { createFileRoute } from "@tanstack/react-router";

import { createTodoForm } from "../features/todos/todos.form.ts";

// Use the form loader in the route.
export const Route = createFileRoute("/todos")({
  loader: async (loaderOptions) => ({
    formLoaderData: await createTodoForm.loader(loaderOptions),
  }),
  component: CreateTodoPage,
});

function CreateTodoPage() {
  const { formLoaderData } = Route.useLoaderData();
  // Render the same form with progressive enhancement when JavaScript is available.
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

- `zod` is used for the schema authoring experience.
- The library contract is still based on `StandardSchemaV1` plus `StandardJSONSchemaV1`.
- In a React Start app, `actionFn` should be a `createServerFn`.
- The same form works as a regular HTML form without JavaScript and as an enhanced form when JavaScript is available.

## API

### `createIsomorphicForm(options)`

Creates a form definition and returns:

- `loader`: reads the request, runs validation and the action on POST, and returns a typed form state
- `useIsomorphicForm`: turns loader data into `formProps` and reactive `formState`

### `redirectAfterAction(options)`

Helper for returning a redirect from your action while preserving the form action result shape.

### Options

- `schema`: required form schema
- `actionFn`: a React Start server function, typically `createServerFn({ method: "POST" })`, that receives validated `data`
- `defaultValues`: optional initial values
- `formDataOptions`: optional parsing delimiters for nested keys
- `returnedValueSanitizer`: optional function to normalize values stored in `formState`

### `formState`

`formState.status` can be:

- `idle`
- `pending`
- `success`
- `error`

`formState` also includes:

- `values`: the extracted form values
- `result`: present after a successful action
- `error.schema`: schema validation issues
- `error.form`: form-level action error or unexpected error

## Form Field Naming

Nested objects and arrays are extracted from `FormData` key names. By default, these delimiters are used:

- object properties: `.`
- array indexes: `[` and `]`

Examples:

- `title`
- `address.street`
- `items[0].label`

You can override these delimiters with `formDataOptions`.

## Error Handling

There are two error channels:

- schema errors: validation failed before your action ran
- form errors: your action returned `ok: false` or threw unexpectedly

Unexpected thrown errors are wrapped as `FormActionPanic`.

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
