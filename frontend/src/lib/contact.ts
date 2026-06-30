/**
 * Pure logic for the contact form state machine.
 *
 * This module isolates the side-effect-free classification of an HTTP
 * submission outcome into a {@link ContactStatus}, so it can be exercised by
 * unit and property-based tests independently of React or the network layer.
 *
 * Design reference: project-polish-and-seo-automation — Component 2, Property 2.
 */

/**
 * States of the contact form UX machine.
 *
 * - `IDLE` — ready for input.
 * - `TRANSMITTING` — request in flight (fields/button disabled).
 * - `SUCCESS` — server accepted the message (R2.2).
 * - `ERROR_VALIDATION` — server rejected the payload, e.g. 400/422 or other
 *   non-ok status (R2.3).
 * - `ERROR_THROTTLE` — rate limit hit, 429 (R2.4).
 * - `ERROR_NETWORK` — timeout (10s abort) or network failure (R2.7).
 */
export type ContactStatus =
  | "IDLE"
  | "TRANSMITTING"
  | "SUCCESS"
  | "ERROR_VALIDATION"
  | "ERROR_THROTTLE"
  | "ERROR_NETWORK";

/**
 * Discriminated outcome of a contact-form submission attempt.
 *
 * - `{ kind: "ok" }` — the response was successful (`res.ok === true`).
 * - `{ kind: "status"; status }` — a non-ok HTTP response with its status code.
 * - `{ kind: "network" }` — the request aborted (timeout) or threw a network error.
 */
export type ContactOutcome =
  | { kind: "ok" }
  | { kind: "status"; status: number }
  | { kind: "network" };

/**
 * Map an HTTP submission outcome to a terminal form state.
 *
 * Pure and deterministic: no side effects, no I/O. The result depends solely
 * on the provided outcome.
 *
 * - `ok` → `SUCCESS` (R2.2)
 * - status `429` → `ERROR_THROTTLE` (R2.4)
 * - status `400` / any other non-ok → `ERROR_VALIDATION` (R2.3)
 * - `network` (timeout/abort/offline) → `ERROR_NETWORK` (R2.7)
 */
export function classifyContactResponse(
  outcome: ContactOutcome,
): ContactStatus {
  switch (outcome.kind) {
    case "ok":
      return "SUCCESS";
    case "network":
      return "ERROR_NETWORK";
    case "status":
      return outcome.status === 429 ? "ERROR_THROTTLE" : "ERROR_VALIDATION";
  }
}
