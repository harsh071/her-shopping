/**
 * A tiny JSON Schema validator covering exactly the subset the tool contract
 * uses.
 *
 * The schema object handed to WebMCP is the same object validated against at
 * execute time, so the advertised contract and the enforced contract cannot
 * drift apart.
 */

export type JsonSchema = {
  type?: 'object' | 'array' | 'string' | 'integer' | 'number' | 'boolean';
  description?: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  additionalProperties?: false;
  items?: JsonSchema;
  enum?: readonly (string | number | boolean)[];
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  default?: unknown;
};

export class ValidationError extends Error {}

function typeOf(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function validateNode(
  schema: JsonSchema,
  value: unknown,
  path: string,
): unknown {
  if (schema.enum && !schema.enum.includes(value as string)) {
    throw new ValidationError(
      `${path} must be one of: ${schema.enum.join(', ')} (received ${JSON.stringify(value)}).`,
    );
  }

  switch (schema.type) {
    case 'object': {
      if (typeOf(value) !== 'object') {
        throw new ValidationError(`${path} must be an object.`);
      }
      const input = value as Record<string, unknown>;
      const properties = schema.properties ?? {};

      if (schema.additionalProperties === false) {
        const unknownKeys = Object.keys(input).filter(
          (key) => !(key in properties),
        );
        if (unknownKeys.length > 0) {
          throw new ValidationError(
            `${path} has unsupported ${unknownKeys.length > 1 ? 'properties' : 'property'}: ${unknownKeys.join(', ')}.`,
          );
        }
      }

      const output: Record<string, unknown> = {};
      for (const [key, childSchema] of Object.entries(properties)) {
        const present =
          Object.prototype.hasOwnProperty.call(input, key) &&
          input[key] !== undefined;
        if (!present) {
          if (schema.required?.includes(key)) {
            throw new ValidationError(
              `${path} is missing required property "${key}".`,
            );
          }
          if (childSchema.default !== undefined)
            output[key] = childSchema.default;
          continue;
        }
        output[key] = validateNode(childSchema, input[key], `${path}.${key}`);
      }
      return output;
    }

    case 'array': {
      if (!Array.isArray(value))
        throw new ValidationError(`${path} must be an array.`);
      if (schema.minItems !== undefined && value.length < schema.minItems) {
        throw new ValidationError(
          `${path} needs at least ${schema.minItems} items.`,
        );
      }
      if (schema.maxItems !== undefined && value.length > schema.maxItems) {
        throw new ValidationError(
          `${path} allows at most ${schema.maxItems} items.`,
        );
      }
      if (
        schema.uniqueItems &&
        new Set(value.map((item) => JSON.stringify(item))).size !== value.length
      ) {
        throw new ValidationError(`${path} must not contain duplicates.`);
      }
      return schema.items
        ? value.map((item, index) =>
            validateNode(schema.items!, item, `${path}[${index}]`),
          )
        : value;
    }

    case 'string': {
      if (typeof value !== 'string')
        throw new ValidationError(`${path} must be a string.`);
      if (schema.minLength !== undefined && value.length < schema.minLength) {
        throw new ValidationError(
          `${path} must be at least ${schema.minLength} characters.`,
        );
      }
      if (schema.maxLength !== undefined && value.length > schema.maxLength) {
        throw new ValidationError(
          `${path} must be at most ${schema.maxLength} characters.`,
        );
      }
      return value;
    }

    case 'integer':
    case 'number': {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new ValidationError(`${path} must be a number.`);
      }
      if (schema.type === 'integer' && !Number.isInteger(value)) {
        throw new ValidationError(`${path} must be a whole number.`);
      }
      if (schema.minimum !== undefined && value < schema.minimum) {
        throw new ValidationError(
          `${path} must be at least ${schema.minimum}.`,
        );
      }
      if (schema.maximum !== undefined && value > schema.maximum) {
        throw new ValidationError(`${path} must be at most ${schema.maximum}.`);
      }
      return value;
    }

    case 'boolean': {
      if (typeof value !== 'boolean')
        throw new ValidationError(`${path} must be true or false.`);
      return value;
    }

    default:
      return value;
  }
}

export function validateInput<T = Record<string, unknown>>(
  schema: JsonSchema,
  value: unknown,
): T {
  const normalized = value === undefined || value === null ? {} : value;
  return validateNode(schema, normalized, 'input') as T;
}

/**
 * Guard rail for the tool contract itself: every object in a published schema
 * must close additionalProperties, and every string and array must be bounded.
 */
export function auditSchema(schema: JsonSchema, path = 'input'): string[] {
  const problems: string[] = [];
  if (schema.type === 'object') {
    if (schema.additionalProperties !== false) {
      problems.push(`${path} must set additionalProperties: false.`);
    }
    for (const [key, child] of Object.entries(schema.properties ?? {})) {
      problems.push(...auditSchema(child, `${path}.${key}`));
    }
  }
  if (schema.type === 'array') {
    if (schema.maxItems === undefined)
      problems.push(`${path} must set maxItems.`);
    if (schema.items) problems.push(...auditSchema(schema.items, `${path}[]`));
  }
  if (
    schema.type === 'string' &&
    schema.maxLength === undefined &&
    !schema.enum
  ) {
    problems.push(`${path} must set maxLength or an enum.`);
  }
  if (
    (schema.type === 'integer' || schema.type === 'number') &&
    schema.maximum === undefined
  ) {
    problems.push(`${path} must set a maximum.`);
  }
  return problems;
}
