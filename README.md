# TanStack Isomorphic Form

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

### Notes About The Example

- `zod` is used for the schema authoring experience.
- The library contract is still based on `StandardSchemaV1` plus `StandardJSONSchemaV1`.
- In a React Start app, `actionFn` should be a `createServerFn`.
- The same form works as a regular HTML form without JavaScript and as an enhanced form when JavaScript is available.

## API Overview

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

## Development

```bash
pnpm install
pnpm check
pnpm fix
```

## Status

This repository is still early-stage. Expect the public API and packaging details to evolve.

## License

`MIT`
