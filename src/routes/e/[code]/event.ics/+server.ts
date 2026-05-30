import type { RequestHandler } from "./$types";
import { error } from "@sveltejs/kit";
import { db } from "void/db";
import { events } from "$lib/server/db/schema";
import { eq } from "drizzle-orm";
import { buildIcs } from "$lib/server/ics";

export const GET: RequestHandler = async ({ params }) => {
  const shareCode = params.code.toUpperCase();

  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.shareCode, shareCode))
    .limit(1);

  if (!event) {
    throw error(404, "Event not found");
  }

  const uid = `popote-${shareCode}@popote.app`;
  const icsText = buildIcs({
    uid,
    name: event.name,
    start: event.date,
    location: event.location ?? undefined,
    description: event.description ?? undefined,
  });

  const filename = `${event.name.replace(/[^a-zA-Z0-9_-]/g, "_")}.ics`;

  return new Response(icsText, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
};
