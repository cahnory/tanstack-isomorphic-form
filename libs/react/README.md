# `@tanstack-isomorphic-form/react` <!-- omit in toc -->

Progressively enhanced forms for `@tanstack/react-start`.

## Table of Contents <!-- omit in toc -->

- [Installation](#installation)
- [Exports](#exports)
- [Example](#example)
  - [1. Create the server action and form](#1-create-the-server-action-and-form)
  - [2. Use the loader in a React Start route](#2-use-the-loader-in-a-react-start-route)
  - [Example Notes](#example-notes)
- [API](#api)
  - [`createIsomorphicForm(options)`](#createisomorphicformoptions)
  - [`redirectAfterAction(options)`](#redirectafteractionoptions)
  - [Options](#options)
  - [`useIsomorphicForm(loaderData)`](#useisomorphicformloaderdata)
  - [`formState`](#formstate)
- [Form Field Naming](#form-field-naming)
- [Error Handling](#error-handling)
- [Repository](#repository)
- [License](#license)

## Installation

```bash
pnpm add @tanstack-isomorphic-form/react
```

## Exports

- `createIsomorphicForm`
- `redirectAfterAction`

## Example

The example below shows the full flow for a simple todo creation form in `@tanstack/react-start`.

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

### 2. Use the loader in a React Start route

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

- `zod` is used for the schema authoring experience.
- `actionFn` should be a `createServerFn` in a React Start app.
- The same form works as a regular HTML form without JavaScript and as an enhanced form when JavaScript is available.
- The schema contract is based on `StandardSchemaV1` plus `StandardJSONSchemaV1`.

## API

### `createIsomorphicForm(options)`

Creates a form definition and returns:

- `loader`: reads the request, runs validation and the action on `POST`, and returns a typed form state
- `useIsomorphicForm`: turns loader data into `formProps` and reactive `formState`

### `redirectAfterAction(options)`

Helper for returning a redirect from your action while preserving the form action result shape.

### Options

- `schema`: required form schema
- `actionFn`: a React Start server function, typically `createServerFn({ method: "POST" })`, that receives validated `data`
- `defaultValues`: optional initial values
- `formDataOptions`: optional parsing delimiters for nested keys
- `returnedValueSanitizer`: optional function to normalize values stored in `formState`

### `useIsomorphicForm(loaderData)`

Turns loader data into:

- `formProps`: props to spread onto the `<form>`
- `formState`: reactive state representing the current form lifecycle

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

## Repository

- Source: https://github.com/cahnory/tanstack-isomorphic-form/tree/main/libs/react
- Project documentation: https://github.com/cahnory/tanstack-isomorphic-form#readme
- Issues: https://github.com/cahnory/tanstack-isomorphic-form/issues

## License

MIT
