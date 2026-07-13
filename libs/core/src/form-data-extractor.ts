import type { StandardJSONSchemaV1, StandardSchemaV1 } from "@standard-schema/spec";

import {
  type FormDataToObjectOptions,
  type UnfoldFormData,
  type UnfoldFormDataValue,
  unfoldFormData,
} from "./form-data-unfolder.ts";
import {
  type ArrayJSONSchema,
  type JSONSchema,
  type ObjectJSONSchema,
  isJsonSchema,
} from "./json-schema.ts";

type FormDataExtractValue = FormDataEntryValue | readonly FormDataExtractValue[] | FormDataExtract;

type FormDataExtract = {
  [Key: string]: FormDataExtractValue;
};

export type FormDataSchema<
  Input extends Record<string, unknown> = Record<string, unknown>,
  Output = Input,
> = StandardJSONSchemaV1<Input, Output> & StandardSchemaV1<Input, Output>;

export type InferFormDataSchemaExtract<TSchema extends FormDataSchema> =
  InferFormDataSchemaInputExtract<StandardJSONSchemaV1.InferInput<TSchema>>;

type InferFormDataSchemaInputExtract<T extends Record<string, unknown> | readonly unknown[]> = {
  [Key in keyof T]?: T[Key] extends readonly unknown[] | Record<string, unknown>
    ? InferFormDataSchemaInputExtract<T[Key]>
    : string | (null & T[Key]) | (number & T[Key]);
};

export type FormDataExtractor<TSchema extends FormDataSchema = FormDataSchema> = (
  formData: FormData,
) => InferFormDataSchemaExtract<TSchema>;

export const createFormDataExtractor = <const TSchema extends FormDataSchema>(
  schema: TSchema,
  options?: FormDataToObjectOptions,
): FormDataExtractor<TSchema> => {
  const jsonSchema = schema["~standard"].jsonSchema.input({ target: "draft-2020-12" });

  if (!isJsonSchema(jsonSchema)) {
    throw new Error("INVALID_JSON_SCHEMA");
  }

  if (typeof jsonSchema !== "object" || jsonSchema.type !== "object") {
    throw new Error("EXPECTED_OBJECT_JSON_SCHEMA");
  }

  return (formData: FormData) =>
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion
    (extractFormDataObject(unfoldFormData(formData, options), jsonSchema) ??
      {}) as InferFormDataSchemaExtract<TSchema>;
};

const extractFormDataValue = (
  formDataValue: UnfoldFormDataValue | undefined,
  jsonSchema: JSONSchema,
) => {
  if (formDataValue === undefined) {
    return undefined;
  }

  if (typeof jsonSchema === "boolean") {
    return formDataValue;
  }

  if (jsonSchema.type === "object") {
    if (
      typeof formDataValue === "object" &&
      !(Array.isArray(formDataValue) || formDataValue instanceof File)
    ) {
      return extractFormDataObject(formDataValue, jsonSchema);
    }
    return undefined;
  }

  if (jsonSchema.type === "array") {
    if (Array.isArray(formDataValue)) {
      return extractFormDataArray(formDataValue, jsonSchema);
    }
    if (typeof formDataValue === "object" && !(formDataValue instanceof File)) {
      return extractFormDataArray(Object.values(formDataValue), jsonSchema);
    }

    return extractFormDataArray([formDataValue], jsonSchema);
  }

  return formDataValue;
};

const extractFormDataObject = (formDataObject: UnfoldFormData, jsonSchema: ObjectJSONSchema) => {
  const result: FormDataExtract = {};

  if (jsonSchema.properties) {
    Object.entries(jsonSchema.properties).forEach(([key, schema]) => {
      const value = extractFormDataValue(formDataObject[key], schema);
      if (value !== undefined) {
        result[key] = value;
      }
    });
  }

  return Object.keys(result).length > 0 ? result : undefined;
};

const extractFormDataArray = (
  formDataArray: UnfoldFormDataValue[],
  jsonSchema: ArrayJSONSchema,
) => {
  const result: FormDataExtractValue[] = [];

  if (jsonSchema.items || jsonSchema.prefixItems) {
    formDataArray.forEach((item, index) => {
      const itemSchema =
        jsonSchema.prefixItems?.[index] ??
        (Array.isArray(jsonSchema.items) ? jsonSchema.items?.[index] : jsonSchema.items);

      result.push(itemSchema ? (extractFormDataValue(item, itemSchema) ?? item) : item);
    });
  }

  return result.length > 0 ? result : undefined;
};
