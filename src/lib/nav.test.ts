import { describe, expect, it } from "vitest";

import { isActive, navItems } from "@/lib/nav";

describe("isActive", () => {
  it("matches the dashboard only on an exact path", () => {
    expect(isActive("/", "/")).toBe(true);
    expect(isActive("/finance", "/")).toBe(false);
  });

  it("matches a module on its own path", () => {
    expect(isActive("/finance", "/finance")).toBe(true);
  });

  it("matches nested routes under a module", () => {
    expect(isActive("/finance/new", "/finance")).toBe(true);
    expect(isActive("/seasons/abc123/edit", "/seasons")).toBe(true);
  });

  it("does not match a different module", () => {
    expect(isActive("/harvest", "/health")).toBe(false);
  });

  it("marks exactly one item active for every module path", () => {
    for (const item of navItems) {
      const matches = navItems.filter((candidate) =>
        isActive(item.href, candidate.href)
      );
      expect(matches, `ambiguous highlight for ${item.href}`).toHaveLength(1);
    }
  });
});

describe("navItems", () => {
  it("covers the eight PRD modules with unique routes", () => {
    expect(navItems).toHaveLength(8);
    expect(new Set(navItems.map((item) => item.href)).size).toBe(8);
  });
});
