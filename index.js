/**
 * Retrieves a nested value from an object using a dot-notation path.
 * If an array is encountered mid-path, maps over its elements and continues resolving.
 *
 * @param {unknown} obj - The object to resolve from
 * @param {string} path - Dot-notation path e.g. "record.case_access.user_id"
 * @returns {unknown} The resolved value, or undefined if the path doesn't exist
 */
export function getNestedValue(obj, path) {
  const keys = path.split(".");

  function resolve(current, remainingKeys) {
    if (remainingKeys.length === 0) return current;
    if (current === null || current === undefined) return undefined;

    const [key, ...rest] = remainingKeys;

    if (Array.isArray(current)) {
      return current.map((item) => resolve(item, remainingKeys)).flat();
    }

    if (typeof current !== "object") return undefined;

    return resolve(current[key], rest);
  }

  return resolve(obj, keys);
}

/**
 * Attempts to convert a value to a boolean.
 * Handles actual booleans as well as the strings "true" and "false".
 *
 * @param {unknown} value
 * @returns {boolean | null} The boolean value, or null if not convertible
 */
export function toBoolean(value) {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

/**
 * Attempts to convert a value to a comparable number.
 * Handles numbers and date strings (converts dates to timestamps).
 *
 * @param {unknown} value
 * @returns {number | null} The comparable number, or null if not convertible
 */
export function toComparable(value) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const date = Date.parse(value);
    if (!isNaN(date)) return date;
  }
  return null;
}

/**
 * Resolves a value from context if prefixed with "$", otherwise returns it as a raw value.
 *
 * @param {unknown} context - The context object to resolve paths from
 * @param {string} value - A "$"-prefixed path or a raw value
 * @returns {unknown} The resolved or raw value
 */
export function resolveValue(context, value) {
  if (value.startsWith("$")) {
    return getNestedValue(context, value.slice(1));
  }
  return value;
}

/**
 * Evaluates a single rule against a context object.
 *
 * @param {unknown} context - The context object
 * @param {string} lhs - Left-hand side: a "$"-prefixed path or raw value
 * @param {"in" | "not_in" | "equals" | "not_equals" | "greater_than" | "less_than" | "contains"} operator
 * @param {string} rhs - Right-hand side: a "$"-prefixed path or raw value
 * @returns {boolean}
 */
export function checkRule(context, lhs, operator, rhs) {
  const left = resolveValue(context, lhs);
  const right = resolveValue(context, rhs);

  switch (operator) {
    case "in": {
      if (!Array.isArray(right)) return false;
      return right.includes(left);
    }

    case "not_in": {
      if (!Array.isArray(right)) return true;
      return !right.includes(left);
    }

    case "equals": {
      const lb = toBoolean(left);
      const rb = toBoolean(right);
      if (lb !== null || rb !== null) {
        return (lb ?? toBoolean(right)) === (rb ?? toBoolean(left));
      }
      return left === right;
    }

    case "not_equals": {
      const lb = toBoolean(left);
      const rb = toBoolean(right);
      if (lb !== null || rb !== null) {
        return (lb ?? toBoolean(right)) !== (rb ?? toBoolean(left));
      }
      return left !== right;
    }

    case "greater_than": {
      const l = toComparable(left);
      const r = toComparable(right);
      if (l === null || r === null) return false;
      return l > r;
    }

    case "less_than": {
      const l = toComparable(left);
      const r = toComparable(right);
      if (l === null || r === null) return false;
      return l < r;
    }

    case "contains": {
      if (typeof left === "string" && typeof right === "string") {
        return left.includes(right);
      }
      if (Array.isArray(left)) {
        return left.includes(right);
      }
      return false;
    }
  }
}

/**
 * @typedef {[string, "in" | "not_in" | "equals" | "not_equals" | "greater_than" | "less_than" | "contains", string]} Rule
 */

/**
 * @typedef {Object} RuleGroup
 * @property {"AND" | "OR"} op - Logical operator to apply across the rules
 * @property {Array<Rule | RuleGroup>} rules - Array of rules or nested rule groups
 */

/**
 * Validates a nested group of rules against a context object.
 * Supports recursive AND/OR grouping.
 *
 * @param {unknown} context - The context object
 * @param {RuleGroup} group - The rule group to evaluate
 * @returns {boolean}
 *
 * @example
 * validateRules(context, {
 *   op: "AND",
 *   rules: [
 *     ["$user.verified", "equals", "true"],
 *     {
 *       op: "OR",
 *       rules: [
 *         ["$user.is_super", "equals", "true"],
 *         ["$user.user_id", "in", "$record.case_access.user_id"],
 *       ],
 *     },
 *   ],
 * })
 */
export function validateRules(context, group) {
  const results = group.rules.map((item) => {
    if ("op" in item) {
      return validateRules(context, item);
    }
    const [lhs, operator, rhs] = item;
    return checkRule(context, lhs, operator, rhs);
  });

  return group.op === "AND"
    ? results.every(Boolean)
    : results.some(Boolean);
}