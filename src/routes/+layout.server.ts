import type { LayoutServerLoad } from "./$types";
import { env } from "$env/dynamic/private";

/**
 * Expose the PUBLIC VAPID key to the client. It is not a secret — the browser
 * needs it to create a push subscription — but we pass it through server load
 * (rather than a `PUBLIC_`-prefixed build-time env var) because the project's
 * tracked env files don't carry it; the key lives in `void.json` worker.vars.
 *
 * `pushEnabled` lets the UI hide the opt-in control entirely when the server
 * has no VAPID config, so we never prompt for a subscription we can't honour.
 */
export const load: LayoutServerLoad = async () => {
  // `$env/dynamic/private` types values as `string`, but at runtime the key may
  // be absent — normalise an empty/undefined value to null so the client can
  // hide the opt-in control when push isn't configured.
  const raw = env.VAPID_PUBLIC_KEY;
  const publicKey: string | null = raw && raw.length > 0 ? raw : null;
  return {
    vapidPublicKey: publicKey,
    pushEnabled: publicKey !== null,
  };
};
