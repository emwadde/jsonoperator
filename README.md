# @emwadde/jsonoperator

## Still under development, do not use in production yet

A lightweight, dependency-free rule evaluation engine. Define conditional logic as plain data structures and evaluate them against any context object at runtime.

Rules are portable — they can be stored in a database, config file, or passed over a network, and evaluated whenever needed.

---

## Installation

```bash
npm i @emwadde/jsonoperator
```

---

## Concepts

### Context

The context is any plain JavaScript object your rules are evaluated against. It can be as deeply nested as needed.

```js
const context = {
  user: {
    id: "u_123",
    verified: true,
    is_super: false,
  },
  record: {
    status: "active",
    case_access: [
      { user_id: "u_123", role: "viewer" },
      { user_id: "u_456", role: "editor" },
    ],
  },
};
```

### Value References

Anywhere a value is accepted, you can either pass a **raw literal** or a **`$`-prefixed path** that resolves against the context using dot-notation.

| Value | Resolves to |
|---|---|
| `"active"` | the string `"active"` |
| `"$record.status"` | `context.record.status` |
| `"$record.case_access.user_id"` | `["u_123", "u_456"]` (fans out across the array) |

---

## API

### `resolveValue(context, value)`

Resolves a value from the context if it starts with `$`, otherwise returns it as a raw literal.

**Parameters**

| Name | Type | Description |
|---|---|---|
| `context` | `unknown` | The context object to resolve paths from |
| `value` | `string` | A `$`-prefixed dot-notation path, or a raw literal string |

**Returns** `unknown` — the resolved context value, or the raw string as-is.

**Examples**

```js
import { resolveValue } from "@emwadde/jsonoperator";

const context = { user: { id: "u_123" } };

resolveValue(context, "$user.id");  // → "u_123"
resolveValue(context, "admin");     // → "admin"
resolveValue(context, "$user.nonexistent"); // → undefined
```

---

### `checkRule(context, lhs, operator, rhs)`

Evaluates a single rule triple against a context object. Both sides can be raw literals or `$`-prefixed context paths.

**Parameters**

| Name | Type | Description |
|---|---|---|
| `context` | `unknown` | The context object |
| `lhs` | `string` | Left-hand side — a `$`-prefixed path or raw value |
| `operator` | `string` | The comparison operator (see below) |
| `rhs` | `string` | Right-hand side — a `$`-prefixed path or raw value |

**Returns** `boolean`

**Operators**

| Operator | Description |
|---|---|
| `equals` | Strict equality. Coerces `"true"`/`"false"` strings to booleans before comparing. |
| `not_equals` | Inverse of `equals`. |
| `in` | Checks if `lhs` is an element of `rhs` (rhs must resolve to an array). |
| `not_in` | Checks if `lhs` is NOT an element of `rhs`. |
| `greater_than` | Numeric or date comparison (`lhs > rhs`). Date strings are converted to timestamps. |
| `less_than` | Numeric or date comparison (`lhs < rhs`). |
| `contains` | Checks if a string `lhs` contains string `rhs`, or if array `lhs` includes `rhs`. |

**Examples**

```js
import { checkRule } from "@emwadde/jsonoperator";

const context = {
  user: { id: "u_123", verified: true },
  record: {
    status: "active",
    case_access: [{ user_id: "u_123" }, { user_id: "u_456" }],
  },
};

// Raw literal comparison
checkRule(context, "$record.status", "equals", "active"); // → true

// Boolean coercion — "true" string is treated as boolean true
checkRule(context, "$user.verified", "equals", "true"); // → true

// "in" against a path that fans out to an array
checkRule(context, "$user.id", "in", "$record.case_access.user_id"); // → true

// Date comparison
checkRule(context, "$record.due_date", "less_than", "2026-12-31"); // → true/false
```

---

### `validateRules(context, group)`

Evaluates a nested group of rules against a context object. Groups can contain individual rules or other nested groups, allowing arbitrarily complex AND/OR logic.

**Parameters**

| Name | Type | Description |
|---|---|---|
| `context` | `unknown` | The context object |
| `group` | `RuleGroup` | The rule group to evaluate |

**Returns** `boolean`

**Types**

```ts
type Rule = [
  lhs: string,
  operator: "in" | "not_in" | "equals" | "not_equals" | "greater_than" | "less_than" | "contains",
  rhs: string
];

type RuleGroup = {
  op: "AND" | "OR";
  rules: Array<Rule | RuleGroup>;
};
```

**Examples**

```js
import { validateRules } from "@emwadde/jsonoperator";

const context = {
  user: { id: "u_123", verified: "true", is_super: "false" },
  record: {
    case_access: [{ user_id: "u_123" }, { user_id: "u_456" }],
  },
};

// Simple AND group
validateRules(context, {
  op: "AND",
  rules: [
    ["$user.verified", "equals", "true"],
    ["$record.status", "not_equals", "archived"],
  ],
});

// Nested AND/OR — user must be verified, and either a super-admin or in the case access list
validateRules(context, {
  op: "AND",
  rules: [
    ["$user.verified", "equals", "true"],
    {
      op: "OR",
      rules: [
        ["$user.is_super", "equals", "true"],
        ["$user.id", "in", "$record.case_access.user_id"],
      ],
    },
  ],
}); // → true
```

Rules can be nested as deeply as needed. Each `RuleGroup` is evaluated independently and its boolean result is fed into the parent group's `AND`/`OR`.

---

## License

MIT