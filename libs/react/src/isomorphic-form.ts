import type {
  FormAction,
  FormDataSchema,
  FormDataToObjectOptions,
  FormLoader,
  InferFormDataSchemaExtract,
  ValueSanitizer,
} from "@tanstack-isomorphic-form/core";
import { createFormDataExtractor, createFormLoader } from "@tanstack-isomorphic-form/core";

import { createIsomorphicFormHook, type IsomorphicFormHook } from "./form-hook.ts";

export const createIsomorphicForm = <
  const TSchema extends FormDataSchema,
  const TActionFn extends FormAction<TSchema>,
>({
  defaultValues,
  formDataOptions,
  actionFn,
  returnedValueSanitizer,
  schema,
}: {
  defaultValues?: InferFormDataSchemaExtract<TSchema> | undefined;
  formDataOptions?: FormDataToObjectOptions | undefined;
  schema: TSchema;
  returnedValueSanitizer?: ValueSanitizer<TSchema> | undefined;
  actionFn: TActionFn;
}): {
  loader: FormLoader<TSchema, TActionFn>;
  useIsomorphicForm: IsomorphicFormHook<TSchema, TActionFn>;
} => {
  const formDataExtractor = createFormDataExtractor(schema, formDataOptions);

  return {
    loader: createFormLoader({
      actionFn,
      defaultValues,
      formDataExtractor,
      returnedValueSanitizer,
      schema,
    }),
    useIsomorphicForm: createIsomorphicFormHook({
      actionFn,
      formDataExtractor,
      returnedValueSanitizer,
      schema,
    }),
  };
};
