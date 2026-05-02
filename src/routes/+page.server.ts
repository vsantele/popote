import type { Actions, PageServerLoad } from "./$types";
import { getUserEvents } from "$lib/server/db";
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

export const load: PageServerLoad = async ({ locals }) => {
  const joinForm = await superValidate(zod4(schema));

  if (!locals.user) {
    return {
      hosted: [],
      joined: [],
      joinForm,
      user: null,
    };
  }

  const { hosted, joined } = await getUserEvents(locals.user.id, true);

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

  return {
    hosted: hosted.map(transformEvent),
    joined: joined.map(transformEvent),
    joinForm,
    user: {
      id: locals.user.id,
      name: locals.user.name,
      email: locals.user.email,
      isAnonymous: locals.user.isAnonymous,
    },
  };
};

export const actions = {
  join: async ({ request }) => {
    const form = await superValidate(request, zod4(schema));

    if (!form.valid) {
      return fail(400, { form });
    }

    throw redirect(303, `/join/${form.data.shareCode}`);
  },
} satisfies Actions;
