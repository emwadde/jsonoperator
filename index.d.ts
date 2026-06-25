/**
 * Retrieves a nested value from an object using a dot-notation path.
 * If an array is encountered mid-path, maps over its elements and continues resolving.
 *
 * @param {unknown} obj - The object to resolve from
 * @param {string} path - Dot-notation path e.g. "record.case_access.user_id"
 * @returns {unknown} The resolved value, or undefined if the path doesn't exist
 */
export function getNestedValue(obj: unknown, path: string): unknown;
/**
 * Attempts to convert a value to a boolean.
 * Handles actual booleans as well as the strings "true" and "false".
 *
 * @param {unknown} value
 * @returns {boolean | null} The boolean value, or null if not convertible
 */
export function toBoolean(value: unknown): boolean | null;
/**
 * Attempts to convert a value to a comparable number.
 * Handles numbers and date strings (converts dates to timestamps).
 *
 * @param {unknown} value
 * @returns {number | null} The comparable number, or null if not convertible
 */
export function toComparable(value: unknown): number | null;
/**
 * Resolves a value from context if prefixed with "$", otherwise returns it as a raw value.
 *
 * @param {unknown} context - The context object to resolve paths from
 * @param {unknown} value - A "$"-prefixed path or a raw value
 * @returns {unknown} The resolved or raw value
 */
export function resolveValue(context: unknown, value: unknown): unknown;
/**
 * Evaluates a single rule against a context object.
 *
 * @param {unknown} context - The context object
 * @param {unknown} lhs - Left-hand side: a "$"-prefixed path or raw value
 * @param {"in" | "not_in" | "equals" | "not_equals" | "equals_bool" | "not_equals_bool" | "greater_than" | "less_than" | "contains"} operator
 * @param {unknown} rhs - Right-hand side: a "$"-prefixed path or raw value
 * @returns {boolean}
 */
export function checkRule(context: unknown, lhs: unknown, operator: "in" | "not_in" | "equals" | "not_equals" | "equals_bool" | "not_equals_bool" | "greater_than" | "less_than" | "contains", rhs: unknown): boolean;
/**
 * @typedef {[unknown, "in" | "not_in" | "equals" | "not_equals" | "equals_bool" | "not_equals_bool" | "greater_than" | "less_than" | "contains", unknown]} Rule
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
 *     ["$user.verified", "equals_bool", true],
 *     {
 *       op: "OR",
 *       rules: [
 *         ["$user.is_super", "equals_bool", true],
 *         ["$user.user_id", "in", "$record.case_access.user_id"],
 *       ],
 *     },
 *   ],
 * })
 */
export function validateRules(context: unknown, group: RuleGroup): boolean;
export type Rule = [unknown, "in" | "not_in" | "equals" | "not_equals" | "equals_bool" | "not_equals_bool" | "greater_than" | "less_than" | "contains", unknown];
export type RuleGroup = {
    /**
     * - Logical operator to apply across the rules
     */
    op: "AND" | "OR";
    /**
     * - Array of rules or nested rule groups
     */
    rules: Array<Rule | RuleGroup>;
};
