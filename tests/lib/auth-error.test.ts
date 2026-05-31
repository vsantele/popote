import { describe, it, expect } from "vite-plus/test";
import { signInErrorKey, signUpErrorKey } from "../../src/lib/server/auth-error";

/**
 * Tests for the auth error-code → semantic key mapping used in
 * src/routes/account/+page.server.ts.
 *
 * These are pure functions with no I/O or SvelteKit dependencies, so they
 * run in the plain Node environment (tests/lib project).
 *
 * The exact error codes are confirmed by reading:
 *   - node_modules/better-auth/dist/api/routes/sign-in.mjs  → INVALID_EMAIL_OR_PASSWORD
 *   - node_modules/better-auth/dist/api/routes/sign-up.mjs  → USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL
 *   - @better-auth/core error.mjs / BASE_ERROR_CODES
 */

describe("signInErrorKey", () => {
  it("maps INVALID_EMAIL_OR_PASSWORD to invalid_credentials", () => {
    expect(signInErrorKey("INVALID_EMAIL_OR_PASSWORD")).toBe(
      "invalid_credentials",
    );
  });

  it("falls back to generic_signin for an unknown code", () => {
    expect(signInErrorKey("SOME_UNKNOWN_ERROR")).toBe("generic_signin");
  });

  it("falls back to generic_signin when code is undefined", () => {
    expect(signInErrorKey(undefined)).toBe("generic_signin");
  });

  it("falls back to generic_signin for an empty string", () => {
    expect(signInErrorKey("")).toBe("generic_signin");
  });
});

describe("signUpErrorKey", () => {
  it("maps USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL to email_taken", () => {
    expect(signUpErrorKey("USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL")).toBe(
      "email_taken",
    );
  });

  it("maps USER_ALREADY_EXISTS to email_taken", () => {
    // Some better-auth versions / plugins surface this shorter code variant.
    expect(signUpErrorKey("USER_ALREADY_EXISTS")).toBe("email_taken");
  });

  it("falls back to generic_signup for an unknown code", () => {
    expect(signUpErrorKey("SOME_UNKNOWN_ERROR")).toBe("generic_signup");
  });

  it("falls back to generic_signup when code is undefined", () => {
    expect(signUpErrorKey(undefined)).toBe("generic_signup");
  });
});
