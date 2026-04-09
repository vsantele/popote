import type { Actions, PageServerLoad } from "./$types";
import { getUserEvents } from "$lib/server/db";
import { DEVICE_ID_KEY } from "$lib/utils/device-id";
import { z } from "zod";
import { zod4 } from "sveltekit-superforms/adapters";
import { superValidate } from "sveltekit-superforms/server";
import { fail, redirect } from "@sveltejs/kit";

const schema = z.object({
  shareCode: z
    .string()
    .min(1, "Code is required")
    .max(6, "Code must be at most 6 characters")
    .toUpperCase(),
});

export const load: PageServerLoad = async ({ cookies }) => {
  // Get device ID from cookie

  const deviceId = cookies.get(DEVICE_ID_KEY);

  if (!deviceId) {
    // User has no device ID yet, show empty state
    return {
      hosted: [],
      joined: [],
    };
  }

  // Fetch all events for this user
  const { hosted, joined } = await getUserEvents(deviceId, true);
  // Transform to frontend format
  const transformEvent = (event: (typeof hosted)[number]) => ({
    id: String(event.id),
    name: event.name,
    date: event.date.toISOString(),
    location: event.location || undefined,
    description: event.description || undefined,
    host_name: event.hostName,
    share_code: event.shareCode,
    created: event.createdAt.toISOString(),
  });

  const joinForm = await superValidate(zod4(schema));

  return {
    hosted: hosted.map(transformEvent),
    joined: joined.map(transformEvent),
    joinForm,
  };
};

export const actions = {
  join: async ({ request }) => {
    const form = await superValidate(request, zod4(schema));

    if (!form.valid) {
      // Return { form } and things will just work.
      return fail(400, { form });
    }

    // If valid, redirect to event page
    throw redirect(303, `/join/${form.data.shareCode}`);
  },
} satisfies Actions;
