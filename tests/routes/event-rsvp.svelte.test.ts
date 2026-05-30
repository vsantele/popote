import { describe, it, expect, vi, beforeAll } from "vite-plus/test";
import { render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
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

const VIEWER = "user-viewer";
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

type RenderOpts = {
  currentUserId: string | null;
  isHost: boolean;
  viewerRsvp?: "going" | "maybe" | "not";
  viewerExtra?: number;
};

function renderEvent({
  currentUserId,
  isHost,
  viewerRsvp = "going",
  viewerExtra = 0,
}: RenderOpts) {
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
      rsvp: "going" as const,
      extra_guests: 2,
      created: "",
    },
    {
      id: "p2",
      event: "1",
      name: "Moi",
      user_id: VIEWER,
      is_host: false,
      rsvp: viewerRsvp,
      extra_guests: viewerExtra,
      created: "",
    },
    {
      id: "p3",
      event: "1",
      name: "Autre",
      user_id: "user-other",
      is_host: false,
      rsvp: "maybe" as const,
      extra_guests: 1,
      created: "",
    },
  ];

  const currentParticipant = participants.find(
    (p) => p.user_id === currentUserId,
  );

  const props = {
    params: { code: "ABC123" },
    form: null,
    data: {
      event,
      participants,
      items: [],
      currentParticipant,
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

describe("Event RSVP control + headcount header", () => {
  it("shows the confirmed headcount summing going participants + their +1s", () => {
    // Host: going +2 -> 3 ; viewer: going +0 -> 1 ; other: maybe +1 (not confirmed)
    renderEvent({ currentUserId: VIEWER, isHost: false });
    // 3 + 1 = 4 confirmed, 2 maybe
    expect(screen.getByText(/4 confirmés/)).toBeInTheDocument();
    expect(screen.getByText(/2 peut-être/)).toBeInTheDocument();
  });

  it("renders an RSVP button reflecting the viewer's own state (going)", () => {
    renderEvent({
      currentUserId: VIEWER,
      isHost: false,
      viewerRsvp: "going",
      viewerExtra: 0,
    });
    const btn = document.querySelector('[data-rsvp="going"]');
    expect(btn).not.toBeNull();
    expect(btn?.textContent).toContain("Je viens");
  });

  it("reflects a 'maybe' RSVP state on the button", () => {
    renderEvent({
      currentUserId: VIEWER,
      isHost: false,
      viewerRsvp: "maybe",
    });
    const btn = document.querySelector('[data-rsvp="maybe"]');
    expect(btn).not.toBeNull();
    expect(btn?.textContent).toContain("Peut-être");
  });

  it("does NOT render an RSVP button for a non-participant viewer", () => {
    renderEvent({ currentUserId: null, isHost: false });
    expect(document.querySelector("[data-rsvp]")).toBeNull();
  });
});

describe("Host RSVP — +1s-only control", () => {
  it("host sees no going/maybe/not toggle group in the RSVP dialog", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderEvent({ currentUserId: HOST, isHost: true });

    // Open the RSVP dialog by clicking the host's RSVP button
    const rsvpBtn = document.querySelector("[data-rsvp]");
    expect(rsvpBtn).not.toBeNull();
    await user.click(rsvpBtn as Element);

    // The going/maybe/not toggle group should NOT be present for the host
    expect(document.querySelector("[data-rsvp-toggle]")).toBeNull();

    // But the extraGuests input should be present
    expect(screen.getByLabelText("Accompagnants (+1)")).toBeInTheDocument();
  });

  it("non-host sees the full going/maybe/not toggle group in the RSVP dialog", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderEvent({ currentUserId: VIEWER, isHost: false });

    const rsvpBtn = document.querySelector("[data-rsvp]");
    expect(rsvpBtn).not.toBeNull();
    await user.click(rsvpBtn as Element);

    // Non-host should see the toggle group with going/maybe/not
    expect(document.querySelector("[data-rsvp-toggle]")).not.toBeNull();

    // All three options should be present (French labels).
    // bits-ui ToggleGroup with type="single" renders items as role="radio".
    expect(screen.getByRole("radio", { name: /Je viens/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Peut-être/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /Pas dispo/i })).toBeInTheDocument();
  });
});
