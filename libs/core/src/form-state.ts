import type { StandardSchemaV1 } from "@standard-schema/spec";

import type { FormDataSchema, InferFormDataSchemaExtract } from "./form-data-extractor.ts";

export type FormState<
  TSchema extends FormDataSchema = FormDataSchema,
  TResult = unknown,
  TError = unknown,
> =
  | IdleFormState<TSchema>
  | ErrorFormState<TSchema, TError>
  | SuccessFormState<TSchema, TResult>
  | PendingFormState<TSchema, TError>;

type IdleFormState<TSchema extends FormDataSchema = FormDataSchema> = BaseFormState<
  TSchema,
  "idle"
> & {
  error?: undefined;
};

type ErrorFormState<
  TSchema extends FormDataSchema = FormDataSchema,
  TError = unknown,
> = BaseFormState<TSchema, "error"> & {
  error:
    | {
        schema: StandardSchemaV1.FailureResult["issues"];
        form: undefined;
      }
    | { schema: undefined; form: TError };
};

type SuccessFormState<
  TSchema extends FormDataSchema = FormDataSchema,
  TResult = unknown,
> = BaseFormState<TSchema, "success"> & {
  result: TResult;
  error?: undefined;
};

type PendingFormState<
  TSchema extends FormDataSchema = FormDataSchema,
  TError = unknown,
> = BaseFormState<TSchema, "pending"> & {
  error?:
    | { schema: StandardSchemaV1.FailureResult["issues"]; form: undefined }
    | { schema: undefined; form: TError };
};

type BaseFormState<TSchema extends FormDataSchema, TStatus extends string> = {
  status: TStatus;
  values: InferFormDataSchemaExtract<TSchema>;
};
