import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  getNestedValue,
  resolveValue,
  checkRule,
  validateRules,
} from "./index.js";

// ─── Shared context ───────────────────────────────────────────────────────────

const context = {
  user: {
    id: "u_123",
    verified: true,
    is_super: false,
    score: 42,
    joined: "2023-01-01",
    bio: "hello world",
  },
  record: {
    status: "active",
    case_access: [
      { user_id: "u_123", role: "viewer" },
      { user_id: "u_456", role: "editor" },
    ],
  },
};

// ─── getNestedValue ───────────────────────────────────────────────────────────

describe("getNestedValue", () => {
  it("resolves a shallow key", () => {
    assert.deepEqual(getNestedValue(context, "record"), context.record);
  });

  it("resolves a deeply nested key", () => {
    assert.equal(getNestedValue(context, "user.id"), "u_123");
  });

  it("fans out over arrays and collects values", () => {
    assert.deepEqual(
      getNestedValue(context, "record.case_access.user_id"),
      ["u_123", "u_456"]
    );
  });

  it("returns undefined for a missing key", () => {
    assert.equal(getNestedValue(context, "user.nonexistent"), undefined);
  });

  it("returns undefined when traversing through null", () => {
    assert.equal(getNestedValue({ a: null }, "a.b"), undefined);
  });

  it("returns undefined when traversing through a primitive", () => {
    assert.equal(getNestedValue({ a: 42 }, "a.b"), undefined);
  });

  it("returns the object itself for a single-segment path", () => {
    assert.deepEqual(getNestedValue(context, "user"), context.user);
  });
});

// ─── resolveValue ─────────────────────────────────────────────────────────────

describe("resolveValue", () => {
  it("resolves a $-prefixed path against the context", () => {
    assert.equal(resolveValue(context, "$user.id"), "u_123");
  });

  it("returns a raw string literal unchanged", () => {
    assert.equal(resolveValue(context, "active"), "active");
  });

  it("returns a boolean literal unchanged", () => {
    assert.equal(resolveValue(context, true), true);
  });

  it("returns a number literal unchanged", () => {
    assert.equal(resolveValue(context, 3), 3);
  });

  it("returns null unchanged", () => {
    assert.equal(resolveValue(context, null), null);
  });
});

// ─── checkRule ────────────────────────────────────────────────────────────────

describe("checkRule — equals", () => {
  it("returns true for identical strings", () => {
    assert.equal(checkRule(context, "$record.status", "equals", "active"), true);
  });

  it("returns false for differing strings", () => {
    assert.equal(checkRule(context, "$record.status", "equals", "archived"), false);
  });

  it("returns true for identical numbers", () => {
    assert.equal(checkRule(context, "$user.score", "equals", 42), true);
  });

  it("does not coerce boolean strings — 'true' !== true", () => {
    assert.equal(checkRule(context, "$user.verified", "equals", "true"), false);
  });
});

describe("checkRule — not_equals", () => {
  it("returns true when values differ", () => {
    assert.equal(checkRule(context, "$record.status", "not_equals", "archived"), true);
  });

  it("returns false when values are the same", () => {
    assert.equal(checkRule(context, "$record.status", "not_equals", "active"), false);
  });
});

describe("checkRule — equals_bool", () => {
  it("matches a real boolean true against literal true", () => {
    assert.equal(checkRule(context, "$user.verified", "equals_bool", true), true);
  });

  it("matches a real boolean false against literal false", () => {
    assert.equal(checkRule(context, "$user.is_super", "equals_bool", false), true);
  });

  it("matches a real boolean against the string 'true'", () => {
    assert.equal(checkRule(context, "$user.verified", "equals_bool", "true"), true);
  });

  it("returns false when neither side is boolean-coercible", () => {
    assert.equal(checkRule(context, "$record.status", "equals_bool", "active"), false);
  });

  it("returns false when only one side is boolean-coercible", () => {
    assert.equal(checkRule(context, "$user.verified", "equals_bool", "active"), false);
  });
});

describe("checkRule — not_equals_bool", () => {
  it("returns true when bool values differ", () => {
    assert.equal(checkRule(context, "$user.verified", "not_equals_bool", false), true);
  });

  it("returns false when bool values match", () => {
    assert.equal(checkRule(context, "$user.verified", "not_equals_bool", true), false);
  });

  it("returns false when neither side is boolean-coercible", () => {
    assert.equal(checkRule(context, "$record.status", "not_equals_bool", "active"), false);
  });
});

describe("checkRule — in", () => {
  it("returns true when lhs is in the resolved array", () => {
    assert.equal(
      checkRule(context, "$user.id", "in", "$record.case_access.user_id"),
      true
    );
  });

  it("returns false when lhs is not in the resolved array", () => {
    assert.equal(
      checkRule(context, "u_999", "in", "$record.case_access.user_id"),
      false
    );
  });

  it("returns false when rhs is not an array", () => {
    assert.equal(checkRule(context, "$user.id", "in", "$user.score"), false);
  });
});

describe("checkRule — not_in", () => {
  it("returns true when lhs is absent from the array", () => {
    assert.equal(
      checkRule(context, "u_999", "not_in", "$record.case_access.user_id"),
      true
    );
  });

  it("returns false when lhs is present in the array", () => {
    assert.equal(
      checkRule(context, "$user.id", "not_in", "$record.case_access.user_id"),
      false
    );
  });

  it("returns true when rhs is not an array", () => {
    assert.equal(checkRule(context, "$user.id", "not_in", "$user.score"), true);
  });
});

describe("checkRule — greater_than", () => {
  it("returns true when lhs number > rhs number", () => {
    assert.equal(checkRule(context, "$user.score", "greater_than", 10), true);
  });

  it("returns false when lhs number < rhs number", () => {
    assert.equal(checkRule(context, "$user.score", "greater_than", 100), false);
  });

  it("compares date strings as timestamps", () => {
    assert.equal(
      checkRule(context, "$user.joined", "greater_than", "2020-01-01"),
      true
    );
  });

  it("returns false when a side is not comparable", () => {
    assert.equal(
      checkRule(context, "$record.status", "greater_than", "active"),
      false
    );
  });
});

describe("checkRule — less_than", () => {
  it("returns true when lhs number < rhs number", () => {
    assert.equal(checkRule(context, "$user.score", "less_than", 100), true);
  });

  it("returns false when lhs number > rhs number", () => {
    assert.equal(checkRule(context, "$user.score", "less_than", 10), false);
  });

  it("compares date strings as timestamps", () => {
    assert.equal(
      checkRule(context, "$user.joined", "less_than", "2030-01-01"),
      true
    );
  });
});

describe("checkRule — contains", () => {
  it("returns true when a string contains the substring", () => {
    assert.equal(checkRule(context, "$user.bio", "contains", "world"), true);
  });

  it("returns false when a string does not contain the substring", () => {
    assert.equal(checkRule(context, "$user.bio", "contains", "goodbye"), false);
  });

  it("returns true when an array contains the value", () => {
    assert.equal(
      checkRule(context, "$record.case_access.role", "contains", "editor"),
      true
    );
  });

  it("returns false when an array does not contain the value", () => {
    assert.equal(
      checkRule(context, "$record.case_access.role", "contains", "admin"),
      false
    );
  });

  it("returns false when lhs is neither string nor array", () => {
    assert.equal(checkRule(context, "$user.score", "contains", "4"), false);
  });
});

// ─── validateRules ────────────────────────────────────────────────────────────

describe("validateRules — AND", () => {
  it("returns true when all rules pass", () => {
    assert.equal(
      validateRules(context, {
        op: "AND",
        rules: [
          ["$user.verified", "equals_bool", true],
          ["$record.status", "equals", "active"],
        ],
      }),
      true
    );
  });

  it("returns false when any rule fails", () => {
    assert.equal(
      validateRules(context, {
        op: "AND",
        rules: [
          ["$user.verified", "equals_bool", true],
          ["$record.status", "equals", "archived"],
        ],
      }),
      false
    );
  });

  it("returns true for an empty rules array (vacuous truth)", () => {
    assert.equal(validateRules(context, { op: "AND", rules: [] }), true);
  });
});

describe("validateRules — OR", () => {
  it("returns true when at least one rule passes", () => {
    assert.equal(
      validateRules(context, {
        op: "OR",
        rules: [
          ["$user.is_super", "equals_bool", true],
          ["$record.status", "equals", "active"],
        ],
      }),
      true
    );
  });

  it("returns false when all rules fail", () => {
    assert.equal(
      validateRules(context, {
        op: "OR",
        rules: [
          ["$user.is_super", "equals_bool", true],
          ["$record.status", "equals", "archived"],
        ],
      }),
      false
    );
  });

  it("returns false for an empty rules array", () => {
    assert.equal(validateRules(context, { op: "OR", rules: [] }), false);
  });
});

describe("validateRules — nested groups", () => {
  it("evaluates a nested AND inside OR correctly", () => {
    assert.equal(
      validateRules(context, {
        op: "OR",
        rules: [
          ["$user.is_super", "equals_bool", true],
          {
            op: "AND",
            rules: [
              ["$user.verified", "equals_bool", true],
              ["$user.id", "in", "$record.case_access.user_id"],
            ],
          },
        ],
      }),
      true
    );
  });

  it("evaluates a nested OR inside AND correctly", () => {
    assert.equal(
      validateRules(context, {
        op: "AND",
        rules: [
          ["$user.verified", "equals_bool", true],
          {
            op: "OR",
            rules: [
              ["$user.is_super", "equals_bool", true],
              ["$user.id", "in", "$record.case_access.user_id"],
            ],
          },
        ],
      }),
      true
    );
  });

  it("returns false when the nested group causes the parent AND to fail", () => {
    assert.equal(
      validateRules(context, {
        op: "AND",
        rules: [
          ["$record.status", "equals", "active"],
          {
            op: "OR",
            rules: [
              ["$user.is_super", "equals_bool", true],
              ["$user.id", "equals", "u_999"],
            ],
          },
        ],
      }),
      false
    );
  });
});