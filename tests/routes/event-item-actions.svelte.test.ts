import { describe, it, expect, vi, beforeAll } from "vite-plus/test";
import { render, screen } from "@testing-library/svelte";
import { readable } from "svelte/store";
import { zod4 } from "sveltekit-superforms/adapters";
import { superValidate } from "sveltekit-superforms";
import {
  addItemSchema,
  editItemSchema,
  deleteItemSchema,
} from "../../src/lib/schemas/item.schema";
import { rsvpSchema } from "../../src/lib/schemas/rsvp.schema";
import {
  createSlotSchema,
  editSlotSchema,
  deleteSlotSchema,
  claimSlotSchema,
} from "../../src/lib/schemas/slot.schema";
import EventPage from "../../src/routes/e/[code]/+page.svelte";
import type { ComponentProps } from "svelte";

// superForm and the page read SvelteKit's navigation/page stores; provide
// minimal stand-ins like the existing home component test does.
vi.mock("$app/stores", () => ({
  page: readable({ url: new URL("http://localhost/e/ABC123"), form: undefined }),
  navigating: readable(null),
}));

vi.mock("$app/state", () => ({
  page: { url: new URL("http://localhost/e/ABC123") },
}));

vi.mock("$app/navigation", () => ({
  goto: vi.fn(),
  invalidateAll: vi.fn(),
  beforeNavigate: vi.fn(),
  afterNavigate: vi.fn(),
}));

const VIEWER = "user-viewer";
const OTHER = "user-other";
const HOST = "user-host";

// The component only reads `data` from these forms to seed superForm; the
// precise generic shape is not load-bearing for these tests, so we widen them
// to the component's expected prop types at the render call site.
let addForm: unknown;
let editForm: unknown;
let deleteForm: unknown;
let rsvpForm: unknown;
let createSlotForm: unknown;
let editSlotForm: unknown;
let deleteSlotForm: unknown;
let claimSlotForm: unknown;

beforeAll(async () => {
  addForm = await superValidate(zod4(addItemSchema()));
  editForm = await superValidate(zod4(editItemSchema()));
  deleteForm = await superValidate(zod4(deleteItemSchema()));
  rsvpForm = await superValidate(zod4(rsvpSchema()));
  createSlotForm = await superValidate(zod4(createSlotSchema()));
  editSlotForm = await superValidate(zod4(editSlotSchema()));
  deleteSlotForm = await superValidate(zod4(deleteSlotSchema()));
  claimSlotForm = await superValidate(zod4(claimSlotSchema()));
});

type RenderOpts = { currentUserId: string | null; isHost: boolean };

function renderEvent({ currentUserId, isHost }: RenderOpts) {
  const event = {
    id: "1",
    name: "Soirée test",
    date: new Date("2026-07-18T19:30:00Z").toISOString(),
    location: undefined,
    description: undefined,
    host_name: "Nico",
    host_user_id: HOST,
    share_code: "ABC123",
    created: new Date().toISOString(),
  };

  const participants = [
    { id: "p1", event: "1", name: "Nico", user_id: HOST, is_host: true, rsvp: "going", extra_guests: 0, created: "" },
    { id: "p2", event: "1", name: "Moi", user_id: VIEWER, is_host: false, rsvp: "going", extra_guests: 0, created: "" },
    { id: "p3", event: "1", name: "Autre", user_id: OTHER, is_host: false, rsvp: "going", extra_guests: 0, created: "" },
  ];

  const items = [
    // Belongs to the viewer (participant p2)
    { id: "10", event: "1", participant: "p2", name: "Mon plat", category: "plat", quantity: undefined, created: "" },
    // Belongs to someone else (participant p3)
    { id: "11", event: "1", participant: "p3", name: "Plat des autres", category: "plat", quantity: undefined, created: "" },
  ];

  const props = {
    params: { code: "ABC123" },
    form: null,
    data: {
      event,
      participants,
      items,
      currentParticipant: participants.find((p) => p.user_id === currentUserId),
      currentUserId,
      isHost,
      form: addForm,
      editForm,
      deleteForm,
      rsvpForm,
      createSlotForm,
      editSlotForm,
      deleteSlotForm,
      claimSlotForm,
    },
  } as unknown as ComponentProps<typeof EventPage>;

  return render(EventPage, { props });
}

describe("Event item edit/delete affordances", () => {
  it("shows edit/delete controls for the viewer's OWN item", () => {
    renderEvent({ currentUserId: VIEWER, isHost: false });

    expect(
      screen.getByLabelText("Actions pour Mon plat"),
    ).toBeInTheDocument();
  });

  it("does NOT show controls for an item the viewer does not own", () => {
    renderEvent({ currentUserId: VIEWER, isHost: false });

    expect(
      screen.queryByLabelText("Actions pour Plat des autres"),
    ).not.toBeInTheDocument();
  });

  it("lets the HOST modify ANY item", () => {
    renderEvent({ currentUserId: HOST, isHost: true });

    expect(screen.getByLabelText("Actions pour Mon plat")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Actions pour Plat des autres"),
    ).toBeInTheDocument();
  });

  it("shows NO controls for an anonymous viewer who owns nothing", () => {
    renderEvent({ currentUserId: null, isHost: false });

    expect(
      screen.queryByLabelText("Actions pour Mon plat"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Actions pour Plat des autres"),
    ).not.toBeInTheDocument();
  });
});
