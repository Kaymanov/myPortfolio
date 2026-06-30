import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { constantTimeEqual } from "@/lib/security";

describe("constantTimeEqual", () => {
  // Feature: project-polish-and-seo-automation, Property 5
  // Сравнение секрета корректно: constantTimeEqual(a, b) === true тогда и
  // только тогда, когда a побайтово равно b.
  it("Property 5: returns true iff strings are byte-equal", () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (a, b) => {
        const expected = Buffer.from(a, "utf8").equals(Buffer.from(b, "utf8"));
        expect(constantTimeEqual(a, b)).toBe(expected);
      }),
      { numRuns: 100 },
    );
  });

  // Feature: project-polish-and-seo-automation, Property 5
  // Явно покрываем случай равных строк: для любой строки s сравнение её с
  // собственной (независимой) копией ДОЛЖНО давать true.
  it("Property 5: returns true for equal strings", () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        // Создаём независимую копию той же строки.
        const copy = `${s}`;
        expect(constantTimeEqual(s, copy)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });
});
