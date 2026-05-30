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

const HOST = "user-host";

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

function renderEvent() {
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
    {
      id: "p1",
      event: "1",
      name: "Nico",
      user_id: HOST,
      is_host: true,
      rsvp: "going",
      extra_guests: 0,
      created: "",
    },
  ];

  const props = {
    params: { code: "ABC123" },
    form: null,
    data: {
      event,
      participants,
      items: [],
      currentParticipant: participants[0],
      currentUserId: HOST,
      isHost: true,
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

describe("Add to calendar button", () => {
  it("renders an 'Add to calendar' link in the event header", () => {
    renderEvent();
    // The link label is localised (EN: "Add to calendar" / FR: "Ajouter au calendrier")
    const link = screen.getByRole("link", {
      name: /add to calendar|ajouter au calendrier/i,
    });
    expect(link).toBeInTheDocument();
  });

  it("link href points to the .ics endpoint", () => {
    renderEvent();
    const link = screen.getByRole("link", {
      name: /add to calendar|ajouter au calendrier/i,
    });
    expect(link).toHaveAttribute("href", "/e/ABC123/event.ics");
  });

  it("link has a download attribute", () => {
    renderEvent();
    const link = screen.getByRole("link", {
      name: /add to calendar|ajouter au calendrier/i,
    });
    expect(link).toHaveAttribute("download");
  });
});
