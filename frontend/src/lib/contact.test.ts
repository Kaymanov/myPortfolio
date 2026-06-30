import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  classifyContactResponse,
  type ContactOutcome,
  type ContactStatus,
} from "./contact";

/**
 * Feature: project-polish-and-seo-automation, Property 2
 *
 * Классификатор ответа контактной формы детерминирован по исходу:
 * ok → SUCCESS; 429 → ERROR_THROTTLE; прочие не-ok → ERROR_VALIDATION;
 * сетевая ошибка/таймаут → ERROR_NETWORK.
 *
 * Validates: Requirements 2.2, 2.3, 2.4, 2.7
 */

// Генератор произвольного исхода отправки, покрывающий все три варианта
// размеченного объединения ContactOutcome. Статусы охватывают как 429, так и
// произвольные другие коды (включая граничные значения HTTP-диапазона).
const outcomeArb: fc.Arbitrary<ContactOutcome> = fc.oneof(
  fc.constant<ContactOutcome>({ kind: "ok" }),
  fc.constant<ContactOutcome>({ kind: "network" }),
  fc
    .integer({ min: 100, max: 599 })
    .map<ContactOutcome>((status) => ({ kind: "status", status })),
);

// Ожидаемое состояние согласно спецификации (независимая реализация маппинга).
function expectedStatus(outcome: ContactOutcome): ContactStatus {
  switch (outcome.kind) {
    case "ok":
      return "SUCCESS";
    case "network":
      return "ERROR_NETWORK";
    case "status":
      return outcome.status === 429 ? "ERROR_THROTTLE" : "ERROR_VALIDATION";
  }
}

describe("classifyContactResponse — Property 2", () => {
  it("maps any outcome deterministically to the specified status", () => {
    fc.assert(
      fc.property(outcomeArb, (outcome) => {
        expect(classifyContactResponse(outcome)).toBe(expectedStatus(outcome));
      }),
      { numRuns: 100 },
    );
  });

  it("is deterministic: same outcome always yields the same status", () => {
    fc.assert(
      fc.property(outcomeArb, (outcome) => {
        const first = classifyContactResponse(outcome);
        const second = classifyContactResponse(outcome);
        expect(first).toBe(second);
      }),
      { numRuns: 100 },
    );
  });

  it("maps ok → SUCCESS", () => {
    expect(classifyContactResponse({ kind: "ok" })).toBe("SUCCESS");
  });

  it("maps 429 → ERROR_THROTTLE", () => {
    expect(classifyContactResponse({ kind: "status", status: 429 })).toBe(
      "ERROR_THROTTLE",
    );
  });

  it("maps other non-ok status → ERROR_VALIDATION", () => {
    expect(classifyContactResponse({ kind: "status", status: 400 })).toBe(
      "ERROR_VALIDATION",
    );
    expect(classifyContactResponse({ kind: "status", status: 500 })).toBe(
      "ERROR_VALIDATION",
    );
  });

  it("maps network → ERROR_NETWORK", () => {
    expect(classifyContactResponse({ kind: "network" })).toBe("ERROR_NETWORK");
  });
});
