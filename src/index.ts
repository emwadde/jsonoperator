export function getNestedValue(obj: unknown, path: string): unknown {
  const keys = path.split(".");

  function resolve(current: unknown, remainingKeys: string[]): unknown {
    if (remainingKeys.length === 0) return current;
    if (current === null || current === undefined) return undefined;

    const [key, ...rest] = remainingKeys;

    if (Array.isArray(current)) {
      // Map over the array and continue resolving the rest of the path on each element
      return current.map((item) => resolve(item, remainingKeys)).flat();
    }

    if (typeof current !== "object") return undefined;

    return resolve((current as Record<string, unknown>)[key], rest);
  }

  return resolve(obj, keys);
}

export function toBoolean(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

type Operator =
  | "in"
  | "not_in"
  | "equals"
  | "not_equals"
  | "greater_than"
  | "less_than"
  | "contains"

export function resolveValue(context: unknown, value: string): unknown {
  if (value.startsWith("$")) {
    return getNestedValue(context, value.slice(1));
  }
  return value;
}

export function toComparable(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const date = Date.parse(value);
    if (!isNaN(date)) return date;
  }
  return null;
}

export function checkRule(
  context: unknown,
  lhs: string,
  operator: Operator,
  rhs: string
): boolean {
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
      // If either side is a boolean (or "true"/"false" string), compare as boolean
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


type Rule = [string, Operator, string]

type RuleGroup = {
  op: "AND" | "OR"
  rules: Array<Rule | RuleGroup>
}

export function validateRules(context: unknown, group: RuleGroup): boolean {
  const results = group.rules.map((item) => {
    // If it has an "op" key, it's a nested RuleGroup — recurse
    if ("op" in item) {
      return validateRules(context, item as RuleGroup)
    }
    // Otherwise it's a Rule tuple
    const [lhs, operator, rhs] = item as Rule
    return checkRule(context, lhs, operator, rhs)
  })

  return group.op === "AND"
    ? results.every(Boolean)
    : results.some(Boolean)
}