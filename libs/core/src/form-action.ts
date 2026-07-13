import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { RegisteredRouter, ToOptions } from "@tanstack/router-core";

import type {
  FormDataExtractor,
  FormDataSchema,
  InferFormDataSchemaExtract,
} from "./form-data-extractor.ts";
import type { FormState } from "./form-state.ts";

type FormActionResponse<TResult = any, TError = any> =
  | { ok: true; result: TResult }
  | { ok: false; error: TError }
  | { ok: boolean };

type FormActionResponseWithRedirection<
  TResult = any,
  TError = any,
  TRedirect extends RedirectOptions = any,
> =
  | FormActionResponse<TResult, TError>
  | {
      ok: boolean;
      redirect: TRedirect;
    };

export type FormAction<
  TSchema extends FormDataSchema,
  TResult = any,
  TError = any,
  TRedirect extends RedirectOptions = any,
> = (options: {
  data: StandardSchemaV1.InferOutput<TSchema>;
}) => Promise<FormActionResponseWithRedirection<TResult, TError, TRedirect>>;

type RedirectOptions<
  TFrom extends string = string,
  TTo extends string | undefined = undefined,
  TMaskFrom extends string = TFrom,
  TMaskTo extends string = ".",
> = ToOptions<RegisteredRouter, TFrom, TTo, TMaskFrom, TMaskTo>;

export class FormActionPanic extends Error {
  override name = "FormActionPanic";
}

export type FormActionState<
  TSchema extends FormDataSchema,
  TFormAction extends FormAction<TSchema>,
> = FormState<
  TSchema,
  InferFormActionResult<TFormAction>,
  InferFormActionError<TFormAction> | FormActionPanic
>;

export type InferFormActionResult<THandler extends FormAction<any>> = Awaited<
  ReturnType<THandler>
> & {
  ok: true;
} extends { result: infer IResult }
  ? IResult
  : undefined;

export type InferFormActionRedirect<THandler extends FormAction<any>> =
  Awaited<ReturnType<THandler>> extends { redirect: infer IRedirect } ? IRedirect : undefined;

export type InferFormActionError<THandler extends FormAction<any>> = Awaited<
  ReturnType<THandler>
> & {
  ok: false;
} extends { error: infer IError }
  ? IError
  : undefined;

export type ValueSanitizer<TSchema extends FormDataSchema> = <
  const Input extends InferFormDataSchemaExtract<TSchema>,
  const Output extends InferFormDataSchemaExtract<TSchema>,
>(
  values: Input,
) => Output;

export const runFormAction = async <
  const TSchema extends FormDataSchema,
  const TActionFn extends FormAction<TSchema>,
>({
  actionFn,
  formData,
  formDataExtractor,
  returnedValueSanitizer,
  schema,
}: {
  actionFn: TActionFn;
  formData: FormData;
  formDataExtractor: FormDataExtractor<TSchema>;
  returnedValueSanitizer?: ValueSanitizer<TSchema> | undefined;
  schema: TSchema;
}): Promise<{
  state: FormState<TSchema, InferFormActionResult<TActionFn>, InferFormActionError<TActionFn>>;
  redirect: InferFormActionRedirect<TActionFn> | undefined;
}> => {
  const values = formDataExtractor(formData);
  const sanitizedValues = returnedValueSanitizer ? returnedValueSanitizer(values) : values;
  const validationResult = await schema["~standard"].validate(values);

  if (validationResult.issues) {
    return {
      redirect: undefined,
      state: {
        error: { form: undefined, schema: validationResult.issues },
        status: "error",
        values: sanitizedValues,
      },
    };
  }

  const handlerResult = await actionFn({ data: validationResult.value });

  if (handlerResult.ok) {
    return {
      redirect: "redirect" in handlerResult ? handlerResult.redirect : undefined,
      state: {
        result: "result" in handlerResult ? handlerResult.result : undefined,
        status: "success",
        values: sanitizedValues,
      },
    };
  }

  return {
    redirect: "redirect" in handlerResult ? handlerResult.redirect : undefined,
    state: {
      error: {
        schema: undefined,
        form: "error" in handlerResult ? handlerResult.error : undefined,
      },
      status: "error",
      values: sanitizedValues,
    },
  };
};

type RedirectAfterActionReturn<T extends (RedirectOptions & FormActionResponse) | RedirectOptions> =
  {
    redirect: Omit<T, "ok" | "result" | "error">;
  } & {
    ok: T extends { ok: infer IOk } ? IOk : true;
    result: T & { ok?: true } extends { result: infer IResult } ? IResult : undefined;
    error: T & { ok: false } extends { error: infer IError } ? IError : undefined;
  };

type RedirectAfterAction = {
  <const TRedirect extends RedirectOptions>(
    options: TRedirect,
  ): RedirectAfterActionReturn<TRedirect>;
  <const TRedirect extends RedirectOptions, TResult = any, TError = any>(
    options: TRedirect & FormActionResponse<TResult, TError>,
  ): RedirectAfterActionReturn<TRedirect & FormActionResponse<TResult, TError>>;
};

export const redirectAfterAction: RedirectAfterAction = (
  options: RedirectOptions | (RedirectOptions & FormActionResponse),
) => {
  if (!("ok" in options)) {
    return {
      error: undefined,
      ok: true,
      redirect: options,
      result: undefined,
    };
  }

  if ("error" in options) {
    const { error, ok, ...redirect } = options;

    return {
      error,
      ok,
      redirect,
      result: undefined,
    };
  }

  if ("result" in options) {
    const { ok, result, ...redirect } = options;

    return {
      error: undefined,
      ok,
      redirect,
      result,
    };
  }

  const { ok, ...redirect } = options;

  return {
    error: undefined,
    ok,
    redirect,
    result: undefined,
  };
};
