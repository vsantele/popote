import type { PageServerLoad } from "./$types";
import { getUserEvents } from "$lib/server/db";

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) {
    return { hosted: [], joined: [] };
  }

  const { hosted, joined } = await getUserEvents(locals.user.id, false);

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
  };
};
