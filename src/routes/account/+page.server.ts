import type { PageServerLoad, Actions } from "./$types";
import { DEVICE_ID_KEY } from "$lib/utils/device-id";
import { createSyncCode, getDeviceIdBySyncCode } from "$lib/server/db";
import { fail } from "@sveltejs/kit";

export const load: PageServerLoad = async ({ locals }) => {
  return {
    deviceId: locals.deviceId,
  };
};

export const actions: Actions = {
  generateCode: async ({ locals }) => {
    if (!locals.deviceId) {
      return fail(400, {
        error:
          "Session introuvable. Veuillez d'abord créer ou rejoindre une soirée.",
      });
    }
    try {
      const code = await createSyncCode(locals.deviceId);
      return { code };
    } catch (err) {
      console.error("Failed to generate sync code:", err);
      return fail(500, { error: "Erreur lors de la génération du code" });
    }
  },
  useCode: async ({ request, cookies }) => {
    const data = await request.formData();
    const code = data.get("code")?.toString().trim().toUpperCase();

    if (!code) {
      return fail(400, { error: "Code requis" });
    }

    try {
      const newDeviceId = await getDeviceIdBySyncCode(code);
      if (!newDeviceId) {
        return fail(400, { error: "Code invalide ou expiré" });
      }

      // Adopt the new device ID in cookies for SSR
      cookies.set(DEVICE_ID_KEY, newDeviceId, {
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });

      return { success: true, newDeviceId };
    } catch (err) {
      console.error("Failed to use sync code:", err);
      return fail(500, { error: "Erreur lors de la synchronisation" });
    }
  },
};
