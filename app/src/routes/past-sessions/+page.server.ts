import type { PageServerLoad } from "./$types"
import { getUserEvents } from "$lib/server/db"

export const load: PageServerLoad = async ({ cookies }) => {
  // Get device ID from cookie
  const deviceId = cookies.get("popote_device_id")

  if (!deviceId) {
    // User has no device ID yet, show empty state
    return {
      hosted: [],
      joined: [],
    }
  }

  // Fetch all past events for this user (upcoming: false)
  const { hosted, joined } = await getUserEvents(deviceId, false)

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
  })

  return {
    hosted: hosted.map(transformEvent),
    joined: joined.map(transformEvent),
  }
}
