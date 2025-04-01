// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import Joi from "joi";
import { parseISO, isValid } from "date-fns";
import * as EmailValidator from "email-validator";

// This allows us to re-export Joi types from this file also
// eslint-disable-next-line no-duplicate-imports
import type * as JoiTypes from "joi";

// Modify Joi default options
const joiWithDefaults = Joi.defaults((schema) =>
  schema.options({ abortEarly: false, stripUnknown: true }),
);

// Create any Joi extensions here
const timeWithZoneRegex = new RegExp(/[\d-]+T[\d:.]+(([+-][\d:]+)|Z)$/);
const timestamp: Joi.ExtensionFactory = (joi: Joi.Root) => {
  return {
    type: "timestamp",
    base: joi.string(),
    messages: {
      "timestamp.time": "{{#label}} must be an ISO8601 timestamp with date, time, and timezone",
      "timestamp.parse": "{{#label}} must be an ISO8601 timestamp",
    },
    validate(value: string, helpers) {
      if (!timeWithZoneRegex.test(value)) return { value, errors: helpers.error("timestamp.time") };

      const parsedTimestamp = parseISO(value);
      return isValid(parsedTimestamp)
        ? { value: parsedTimestamp }
        : { value, errors: helpers.error("timestamp.parse") };
    },
  };
};

const dateStringRegex = new RegExp(/^\d{4}-\d{2}-\d{2}$/);
const dateString: Joi.ExtensionFactory = (joi: Joi.Root) => {
  return {
    type: "dateString",
    base: joi.string(),
    messages: {
      "dateString.format": "{{#label}} must be a date in the format yyyy-MM-dd",
      "dateString.parse": "{{#label}} must be a valid ISO8601 date",
    },
    validate(value: string, helpers) {
      if (!dateStringRegex.test(value))
        return { value, errors: helpers.error("dateString.format") };

      const parsedDate = parseISO(value);
      return isValid(parsedDate) ? { value } : { value, errors: helpers.error("dateString.parse") };
    },
  };
};

// looks for comma separated strings, no whitespace, not surrounded by brackets [], and no trailing comma
// good: abc | abc,def,ghi
// bad: [abc], | abc, def, ghi | abc,def,
const queryParamArrayRegex = new RegExp(/^(?!\[)[^,\s]+(?:,[^,\s]+)*(?!\])$/);
const queryParamArray = {
  type: "queryParamArray",
  base: Joi.array(),
  messages: {
    "queryParamArray.format": '{{#label}} must be an array in the format "item1,item2,item3"',
  },
  coerce: {
    from: "string",
    method(value: string, helpers: Joi.CustomHelpers) {
      return queryParamArrayRegex.test(value)
        ? { value: value.split(",") }
        : { value, errors: [helpers.error("queryParamArray.format")] };
    },
  },
};

const email = {
  type: "email",
  base: Joi.string(),
  messages: {
    "email.format": "{{#label}} must be a valid email address",
  },
  validate(value: string, helpers: Joi.CustomHelpers) {
    return EmailValidator.validate(value)
      ? { value }
      : { value, errors: helpers.error("email.validate") };
  },
};

const filesArray = {
  type: "filesArray",
  base: Joi.array().items(Joi.object({ id: Joi.string().required() })),
};

const comment = {
  type: "comment",
  base: Joi.object({
    text: Joi.string().allow("").default(""),
    files: Joi.when("text", {
      not: Joi.equal(""),
      then: filesArray.base.optional(),
      otherwise: filesArray.base.min(1).required(),
    }),
  }),
  messages: {
    "comment.validate": "Comments must contain either text or files",
  },
};

const companyId = {
  type: "companyId",
  base: Joi.string()
    .max(25)
    .pattern(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, "id"),
  messages: {
    "companyId.validate":
      "Company ID must be 25 characters or less and only include lowercase letters, numbers, and hyphens.",
  },
};

// Add any extension types
interface JoiWithExtensions extends Joi.Root {
  /** Validates a company ID. Use this instead of Joi.string when you need to ensure
   *  a company ID is valid. */
  companyId(): Joi.StringSchema;
  /**
   * Validates an ISO-8601 timestamp.
   */
  timestamp(): Joi.AnySchema;
  /**
   * Validates a nominal yyyy-mm-dd date string.
   */
  dateString(): Joi.AnySchema;
  /**
   * Validates and parses into a string[] a comma separated array as in a URL query
   */
  queryParamArray(): Joi.ArraySchema;
  /**
   * Validates that an email address is a legal email address.
   */
  email(): Joi.StringSchema;
  /**
   * Validates the commonly used file array object.
   */
  filesArray(): Joi.ArraySchema;
  /**
   * Validates the shared comment object across tasks and accruals.
   */
  comment(): Joi.ObjectSchema;
}

// Add extensions to joi with modified defaults
const joiWithDefaultsAndExtensions: JoiWithExtensions = joiWithDefaults.extend(
  companyId,
  timestamp,
  dateString,
  queryParamArray,
  email,
  filesArray,
  comment,
);

export type { JoiTypes };
export default joiWithDefaultsAndExtensions;
