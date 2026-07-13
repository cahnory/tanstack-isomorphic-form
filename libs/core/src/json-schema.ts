export type JSONSchema =
  | boolean
  | ObjectJSONSchema
  | ArrayJSONSchema
  | LeafJSONSchema
  | UnionJSONSchema;

export type ObjectJSONSchema = {
  type: "object";
  properties?: Record<string, JSONSchema>;
};

export type ArrayJSONSchema = {
  type: "array";
  items?: JSONSchema | readonly JSONSchema[];
  prefixItems?: readonly JSONSchema[];
};

export type UnionJSONSchema = {
  type?: undefined;
  oneOf?: readonly JSONSchema[];
  anyOf?: readonly JSONSchema[];
  const?: unknown;
};

export type LeafJSONSchema = {
  type?: "string" | "number" | "integer" | "boolean" | "null";
};

export const isJsonSchema = (jsonSchema: unknown): jsonSchema is JSONSchema =>
  typeof jsonSchema === "boolean" ||
  isObjectJSONSchema(jsonSchema) ||
  isArrayJSONSchema(jsonSchema) ||
  isUnionJSONSchema(jsonSchema) ||
  isLeafJSONSchema(jsonSchema);

const isObjectJSONSchema = (jsonSchema: unknown): jsonSchema is ObjectJSONSchema =>
  isObject(jsonSchema) &&
  jsonSchema.type === "object" &&
  (jsonSchema.properties === undefined ||
    (isObject(jsonSchema.properties) && Object.values(jsonSchema.properties).every(isJsonSchema)));

const isArrayJSONSchema = (jsonSchema: unknown): jsonSchema is ArrayJSONSchema =>
  isObject(jsonSchema) &&
  jsonSchema.type === "array" &&
  (jsonSchema.items === undefined ||
    (Array.isArray(jsonSchema.items)
      ? jsonSchema.items.every(isJsonSchema)
      : isJsonSchema(jsonSchema.items)));

const isUnionJSONSchema = (jsonSchema: unknown): jsonSchema is UnionJSONSchema =>
  isObject(jsonSchema) &&
  jsonSchema.type === undefined &&
  (jsonSchema.oneOf === undefined ||
    (Array.isArray(jsonSchema.oneOf) && jsonSchema.oneOf.every(isJsonSchema))) &&
  (jsonSchema.anyOf === undefined ||
    (Array.isArray(jsonSchema.anyOf) && jsonSchema.anyOf.every(isJsonSchema)));

const isLeafJSONSchema = (jsonSchema: unknown): jsonSchema is LeafJSONSchema =>
  isObject(jsonSchema) &&
  (["string", "number", "integer", "boolean", "null"] as unknown[]).includes(jsonSchema.type);

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);
