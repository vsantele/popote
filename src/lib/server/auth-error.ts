/**
 * Maps a better-auth `APIError` body code to a stable key name so callers
 * can produce a localized message without depending on `err.message`
 * (which is always English).
 *
 * The codes come from `BASE_ERROR_CODES` in `@better-auth/core/error`
 * and are confirmed by reading the better-auth source for `signInEmail`
 * and `signUpEmail`.
 */

export type AuthErrorKey =
  | "invalid_credentials" // sign-in: INVALID_EMAIL_OR_PASSWORD
  | "email_taken" // sign-up: USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL | USER_ALREADY_EXISTS
  | "generic_signin" // fallback for any unknown sign-in APIError
  | "generic_signup"; // fallback for any unknown sign-up APIError

/**
 * Returns the semantic key for a sign-in APIError body code.
 * Never throws; unknown codes fall back to `"generic_signin"`.
 */
export function signInErrorKey(code: string | undefined): AuthErrorKey {
  switch (code) {
    case "INVALID_EMAIL_OR_PASSWORD":
      return "invalid_credentials";
    default:
      return "generic_signin";
  }
}

/**
 * Returns the semantic key for a sign-up APIError body code.
 * Never throws; unknown codes fall back to `"generic_signup"`.
 */
export function signUpErrorKey(code: string | undefined): AuthErrorKey {
  switch (code) {
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
    case "USER_ALREADY_EXISTS":
      return "email_taken";
    default:
      return "generic_signup";
  }
}
