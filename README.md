# @emwadde/jsonoperator

A lightweight rule engine for evaluating logical rules against a JSON context object. Supports dot-notation path resolution, array traversal, and nested AND/OR rule groups.

## Installation

```bash
npm install @emwadde/jsonoperator
```

## Usage

```js
import { validateRules, checkRule } from "@emwadde/jsonoperator";

const context = {
  user: {
    user_id: "usr_r079cb",
    verified: true,
    is_super: false,
    user_type_code: "INTERNAL",
  },
  record: {
    id: "case_3so9g34",
    case_access: [
      { user_id: "USR_000", security_role_id: "rol_caseworker" },
      { user_id: "usr_xdvbit", security_role_id: "rol_caseworker" },
    ],
  },
};

// Single rule
checkRule(context, "$user.verified", "equals", "true"); // true
checkRule(context, "$user.user_id", "in", "$record.case_access.user_id"); // false

// Grouped rules
validateRules(context, {
  op: "AND",
  rules: [
    ["$user.verified", "equals", "true"],
    {
      op: "OR",
      rules: [
        ["$user.is_super", "equals", "true"],
        ["$user.user_type_code", "equals", "INTERNAL"],
      ],
    },
  ],
}); // true
```

## API

### `getNestedValue(obj, path)`

Resolves a value from a nested object using a dot-notation path. If an array is encountered mid-path, maps over its elements and continues resolving.

```js
getNestedValue({ a: { b: "hello" } }, "a.b"); // "hello"
getNestedValue({ a: [{ b: 1 }, { b: 2 }] }, "a.b"); // [1, 2]
```

| Argument | Type | Description |
|---|---|---|
| `obj` | `unknown` | The object to resolve from |
| `path` | `string` | Dot-notation path e.g. `"record.case_access.user_id"` |

---

### `resolveValue(context, value)`

Resolves a value from context if prefixed with `$`, otherwise returns it as a raw value. Used internally by `checkRule`.

```js
resolveValue(context, "$user.verified"); // true
resolveValue(context, "INTERNAL");       // "INTERNAL"
```

| Argument | Type | Description |
|---|---|---|
| `context` | `unknown` | The context object |
| `value` | `string` | A `$`-prefixed path or a raw value |

---

### `toBoolean(value)`

Converts a value to a boolean. Handles actual booleans and the strings `"true"` / `"false"`. Returns `null` if not convertible.

```js
toBoolean(true);    // true
toBoolean("false"); // false
toBoolean("hello"); // null
```

---

### `toComparable(value)`

Converts a value to a number for comparison. Handles numbers and date strings. Returns `null` if not convertible.

```js
toComparable(42);                      // 42
toComparable("2026-06-22T00:00:00");   // 1750550400000 (timestamp)
toComparable("hello");                 // null
```

---

### `checkRule(context, lhs, operator, rhs)`

Evaluates a single rule against a context object.

```js
checkRule(context, "$user.verified", "equals", "true");  // true
checkRule(context, "$user.user_id", "in", "$record.case_access.user_id"); // false
```

| Argument | Type | Description |
|---|---|---|
| `context` | `unknown` | The context object |
| `lhs` | `string` | Left-hand side: `$`-prefixed path or raw value |
| `operator` | `Operator` | See operators table below |
| `rhs` | `string` | Right-hand side: `$`-prefixed path or raw value |

#### Operators

| Operator | Description | Applicable types |
|---|---|---|
| `equals` | Strict equality. Coerces `"true"`/`"false"` strings to booleans | string, number, boolean |
| `not_equals` | Strict inequality. Same boolean coercion as `equals` | string, number, boolean |
| `in` | Checks if lhs exists in a rhs array | any |
| `not_in` | Checks if lhs does not exist in a rhs array | any |
| `greater_than` | Compares numbers or date strings | number, date string |
| `less_than` | Compares numbers or date strings | number, date string |
| `contains` | Checks if a string or array contains a value | string, array |

---

### `validateRules(context, group)`

Validates a nested group of rules against a context object. Supports recursive AND/OR grouping.

```js
validateRules(context, {
  op: "AND",
  rules: [
    ["$user.verified", "equals", "true"],
    {
      op: "OR",
      rules: [
        ["$user.is_super", "equals", "true"],
        ["$user.user_id", "in", "$record.case_access.user_id"],
      ],
    },
  ],
});
```

| Argument | Type | Description |
|---|---|---|
| `context` | `unknown` | The context object |
| `group` | `RuleGroup` | The rule group to evaluate |

#### RuleGroup shape

```js
{
  op: "AND" | "OR",
  rules: Array<[lhs, operator, rhs] | RuleGroup>
}
```

## License

MIT
