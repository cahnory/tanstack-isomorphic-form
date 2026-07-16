import {
  type FormAction,
  FormActionPanic,
  type FormActionState,
  type InferFormActionError,
  type InferFormActionResult,
  type ValueSanitizer,
  runFormAction,
  type InferFormDataSchemaExtract,
  type FormDataExtractor,
  type FormDataSchema,
  type FormLoaderReturn,
} from "@tanstack-isomorphic-form/core";
import { isRedirect, useNavigate } from "@tanstack/react-router";
import { type SubmitEvent, useRef, useState } from "react";

export type IsomorphicFormHook<
  TSchema extends FormDataSchema,
  TActionFn extends FormAction<TSchema>,
> = <const TActionUrl extends string>(
  formLoaderData: Awaited<FormLoaderReturn<TSchema, TActionFn, TActionUrl>>,
  options?: IsomorphicFormHookOptions<TSchema, TActionFn>,
) => IsomorphicFormHookReturn<TSchema, TActionFn, TActionUrl>;

type IsomorphicFormHookReturn<
  TSchema extends FormDataSchema,
  TActionFn extends FormAction<TSchema>,
  TActionUrl extends string,
> = {
  formProps: {
    action: TActionUrl;
    method: "post";
    onSubmit: (event: SubmitEvent<HTMLFormElement>) => Promise<void>;
  };
  formState: FormActionState<TSchema, TActionFn>;
};

type IsomorphicFormHookOptions<
  TSchema extends FormDataSchema,
  TActionFn extends FormAction<TSchema>,
> = {
  defaultValues?: InferFormDataSchemaExtract<TSchema> | undefined;
  onError?: ((error: InferFormActionError<TActionFn> | FormActionPanic) => void) | undefined;
  onSuccess?: ((result: InferFormActionResult<TActionFn>) => void) | undefined;
};

export const createIsomorphicFormHook =
  <const TSchema extends FormDataSchema, const TActionFn extends FormAction<TSchema>>({
    formDataExtractor,
    actionFn,
    returnedValueSanitizer,
    schema,
  }: {
    formDataExtractor: FormDataExtractor<TSchema>;
    schema: TSchema;
    returnedValueSanitizer?: ValueSanitizer<TSchema> | undefined;
    actionFn: TActionFn;
  }): IsomorphicFormHook<TSchema, TActionFn> =>
  <const TActionUrl extends string>(
    { actionUrl, state }: Awaited<FormLoaderReturn<TSchema, TActionFn, TActionUrl>>,
    { defaultValues, onError, onSuccess }: IsomorphicFormHookOptions<TSchema, TActionFn> = {},
  ) =>
    useIsomorphicForm({
      actionFn,
      actionUrl,
      defaultValues,
      formDataExtractor,
      onError,
      onSuccess,
      returnedValueSanitizer,
      schema,
      state,
    });

const useIsomorphicForm = <
  const TSchema extends FormDataSchema,
  const TActionFn extends FormAction<TSchema>,
  const TActionUrl extends string,
>({
  actionFn,
  actionUrl,
  defaultValues,
  formDataExtractor,
  onError,
  onSuccess,
  returnedValueSanitizer,
  schema,
  state,
}: {
  actionFn: TActionFn;
  actionUrl: TActionUrl;
  defaultValues?: InferFormDataSchemaExtract<TSchema> | undefined;
  formDataExtractor: FormDataExtractor<TSchema>;
  onError?:
    | ((error: InferFormActionError<TActionFn> | FormActionPanic) => void | Promise<void>)
    | undefined;
  onSuccess?: ((result: InferFormActionResult<TActionFn>) => void | Promise<void>) | undefined;
  returnedValueSanitizer?: ValueSanitizer<TSchema> | undefined;
  schema: TSchema;
  state: FormActionState<TSchema, TActionFn>;
}): IsomorphicFormHookReturn<TSchema, TActionFn, TActionUrl> => {
  const navigate = useNavigate();
  const [formState, setFormState] = useState(
    state.status === "idle" && defaultValues
      ? {
          ...state,
          values: returnedValueSanitizer ? returnedValueSanitizer(defaultValues) : defaultValues,
        }
      : state,
  );
  const submitRef = useRef(false);

  const onSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitRef.current) {
      return;
    }

    submitRef.current = true;
    const formData = new FormData(event.currentTarget, event.nativeEvent.submitter);
    const nextState: FormActionState<TSchema, TActionFn> = {
      status: "pending",
      values: formDataExtractor(formData),
    };
    setFormState(nextState);

    try {
      const actionResult = await runFormAction({
        actionFn,
        formData,
        formDataExtractor,
        returnedValueSanitizer,
        schema,
      });

      setFormState(actionResult.state);

      if (actionResult.state.status === "success") {
        await onSuccess?.(actionResult.state.result);
      } else if (
        actionResult.state.status === "error" &&
        actionResult.state.error.schema === undefined
      ) {
        await onError?.(actionResult.state.error.form);
      }

      if (actionResult.redirect) {
        await navigate(actionResult.redirect);
        return;
      }
    } catch (error) {
      if (isRedirect(error)) {
        return navigate(error.options);
      }

      const panic = new FormActionPanic(error instanceof Error ? error.message : undefined, {
        cause: error,
      });

      setFormState({
        error: {
          form: panic,
          schema: undefined,
        },
        status: "error",
        values: nextState.values,
      });
      await onError?.(panic);
    }
  };

  return {
    formProps: {
      action: actionUrl,
      method: "post",
      onSubmit,
    },
    formState,
  };
};
