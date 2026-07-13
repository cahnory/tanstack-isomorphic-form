import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { isRedirect, redirect } from "@tanstack/router-core";

import {
  type FormAction,
  FormActionPanic,
  type InferFormActionError,
  type InferFormActionResult,
  type ValueSanitizer,
  runFormAction,
} from "./form-action.ts";
import {
  type FormDataExtractor,
  type FormDataSchema,
  type InferFormDataSchemaExtract,
} from "./form-data-extractor.ts";
import type { FormState } from "./form-state.ts";

export type FormLoader<TSchema extends FormDataSchema, TActionFn extends FormAction<TSchema>> = <
  const TActionUrl extends string,
>(
  loaderOptions: FormLoaderOptions<TActionUrl>,
  formOptions?: FormLoaderFormOptions<TSchema>,
) => FormLoaderReturn<TSchema, TActionFn, TActionUrl>;

type FormLoaderOptions<TActionUrl extends string> = { location: { publicHref: TActionUrl } };
type FormLoaderFormOptions<TSchema extends FormDataSchema> = {
  defaultValues?: InferFormDataSchemaExtract<TSchema> | undefined;
};

export type FormLoaderReturn<
  TSchema extends FormDataSchema,
  TActionFn extends FormAction<TSchema>,
  TActionUrl extends string,
> = Promise<{
  actionUrl: TActionUrl;
  state: FormState<
    TSchema,
    InferFormActionResult<TActionFn>,
    InferFormActionError<TActionFn> | FormActionPanic
  >;
}>;

export const createFormLoader =
  <const TSchema extends FormDataSchema, const TActionFn extends FormAction<TSchema>>({
    defaultValues,
    formDataExtractor,
    actionFn,
    returnedValueSanitizer,
    schema,
  }: {
    defaultValues?: InferFormDataSchemaExtract<TSchema> | undefined;
    formDataExtractor: FormDataExtractor<TSchema>;
    schema: TSchema;
    returnedValueSanitizer?: ValueSanitizer<TSchema> | undefined;
    actionFn: TActionFn;
  }): FormLoader<TSchema, TActionFn> =>
  async <const TActionUrl extends string>(
    loaderOptions: FormLoaderOptions<TActionUrl>,
    formOptions: FormLoaderFormOptions<TSchema> = {},
  ) =>
    handleRouteLoad<TSchema, TActionFn, TActionUrl>({
      actionFn,
      actionUrl: loaderOptions.location.publicHref,
      defaultValues: formOptions.defaultValues ?? defaultValues,
      formDataExtractor,
      returnedValueSanitizer,
      schema,
    });

const handleRouteLoad = async <
  const TSchema extends FormDataSchema,
  const TActionFn extends FormAction<TSchema>,
  const TActionUrl extends string,
>({
  actionUrl,
  defaultValues,
  formDataExtractor,
  actionFn,
  returnedValueSanitizer,
  schema,
}: {
  actionUrl: TActionUrl;
  defaultValues?: InferFormDataSchemaExtract<TSchema> | undefined;
  formDataExtractor: FormDataExtractor<TSchema>;
  actionFn: TActionFn;
  returnedValueSanitizer?: ValueSanitizer<TSchema> | undefined;
  schema: TSchema;
}): FormLoaderReturn<TSchema, TActionFn, TActionUrl> => {
  const formData = await readSubmittedFormData();

  if (!formData) {
    return {
      actionUrl,
      state: {
        status: "idle",
        values:
          returnedValueSanitizer && defaultValues
            ? returnedValueSanitizer(defaultValues)
            : (defaultValues ?? {}),
      },
    };
  }

  try {
    const actionResult = await runFormAction({
      actionFn,
      formData,
      formDataExtractor,
      returnedValueSanitizer,
      schema,
    });

    if (actionResult.redirect) {
      throw redirect(actionResult.redirect);
    }

    return {
      actionUrl,
      state: actionResult.state,
    };
  } catch (error) {
    if (isRedirect(error)) {
      throw error;
    }

    return {
      actionUrl,
      state: {
        error: {
          form: new FormActionPanic(error instanceof Error ? error.message : undefined, {
            cause: error,
          }),
          schema: undefined,
        },
        status: "error",
        values: formDataExtractor(formData),
      },
    } as const;
  }
};

const readSubmittedFormData = createIsomorphicFn()
  .server(async () => {
    const request = getRequest();

    if (request.method === "POST") {
      return request.formData();
    }

    return undefined;
  })
  .client(() => {});
