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
  page: readable({
    url: new URL("http://localhost/e/ABC123"),
    form: undefined,
  }),
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

type Slot = {
  id: string;
  label: string;
  category?: string;
  needed_count: number;
  claimed_count: number;
  open_count: number;
};

type RenderOpts = {
  currentUserId: string | null;
  isHost: boolean;
  slots?: Slot[];
  items?: unknown[];
};

function renderEvent({
  currentUserId,
  isHost,
  slots = [],
  items = [],
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
      extra_guests: 0,
      created: "",
    },
    {
      id: "p2",
      event: "1",
      name: "Moi",
      user_id: VIEWER,
      is_host: false,
      rsvp: "going" as const,
      extra_guests: 0,
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
      items,
      slots,
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

describe("Host wishlist / needed slots", () => {
  it("shows the host an 'add a need' affordance even with no slots", () => {
    renderEvent({ currentUserId: HOST, isHost: true });
    // The wishlist section renders for the host with an add trigger.
    expect(screen.getByText("Ajouter un besoin")).toBeInTheDocument();
  });

  it("hides the wishlist section for a guest when there are no slots", () => {
    renderEvent({ currentUserId: VIEWER, isHost: false, slots: [] });
    // No add trigger, and no wishlist heading.
    expect(screen.queryByText("Ajouter un besoin")).toBeNull();
    expect(screen.queryByText("Liste de souhaits de l'hôte")).toBeNull();
  });

  it("renders a claim button on an open slot for a guest", () => {
    renderEvent({
      currentUserId: VIEWER,
      isHost: false,
      slots: [
        {
          id: "s1",
          label: "Tiramisu",
          category: "dessert",
          needed_count: 2,
          claimed_count: 0,
          open_count: 2,
        },
      ],
    });
    const claim = document.querySelector('[data-claim-slot="s1"]');
    expect(claim).not.toBeNull();
    expect(claim?.textContent).toContain("Je m'en occupe");
  });

  it("does NOT render a claim button on a fully-claimed slot", () => {
    renderEvent({
      currentUserId: VIEWER,
      isHost: false,
      slots: [
        {
          id: "s2",
          label: "Glaçons",
          category: undefined,
          needed_count: 1,
          claimed_count: 1,
          open_count: 0,
        },
      ],
    });
    // The slot row still shows, marked as filled, but no claim affordance.
    expect(document.querySelector('[data-slot="s2"]')).not.toBeNull();
    expect(document.querySelector('[data-claim-slot="s2"]')).toBeNull();
    expect(screen.getByText(/Complet/)).toBeInTheDocument();
  });

  it("reflects unclaimed slots in the gap hint", () => {
    renderEvent({
      currentUserId: VIEWER,
      isHost: false,
      slots: [
        {
          id: "s1",
          label: "Glaçons",
          category: undefined,
          needed_count: 1,
          claimed_count: 0,
          open_count: 1,
        },
      ],
    });
    // The open slot surfaces as a "still needed" chip in the gap hint.
    const chip = document.querySelector('[data-open-slot="s1"]');
    expect(chip).not.toBeNull();
    expect(chip?.textContent).toContain("Glaçons");
    expect(screen.getByText(/Il manque encore/)).toBeInTheDocument();
  });

  it("drops a slot out of the gap hint once it is fully claimed", () => {
    renderEvent({
      currentUserId: VIEWER,
      isHost: false,
      slots: [
        {
          id: "s2",
          label: "Glaçons",
          category: undefined,
          needed_count: 1,
          claimed_count: 1,
          open_count: 0,
        },
      ],
    });
    // Fully claimed: it no longer appears as an open-slot gap chip.
    expect(document.querySelector('[data-open-slot="s2"]')).toBeNull();
  });
});
