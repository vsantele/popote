/**
 * Tests for dietary tag feature:
 *  1. Tag chips render on the board for an item that carries tags.
 *  2. The add-item dialog renders the tag picker.
 *  3. The edit-item dialog pre-fills with the item's existing tags.
 *
 * We use `userEvent.setup({ pointerEventsCheck: 0 })` to avoid a known
 * jsdom false-positive where a previously open dialog leaves
 * `pointer-events:none` on `document.body`.
 */
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

beforeAll(async () => {
  addForm = await superValidate(zod4(addItemSchema()));
  editForm = await superValidate(zod4(editItemSchema()));
  deleteForm = await superValidate(zod4(deleteItemSchema()));
  rsvpForm = await superValidate(zod4(rsvpSchema()));
});

function makeItem(overrides: Partial<{
  id: string;
  name: string;
  participant: string;
  dietary_tags: string[];
}> = {}) {
  return {
    id: "10",
    event: "1",
    participant: "p2",
    name: "Mon plat",
    category: "plat",
    quantity: undefined,
    dietary_tags: [],
    created: "",
    ...overrides,
  };
}

function renderEvent(items: ReturnType<typeof makeItem>[] = []) {
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
  ];

  const currentParticipant = participants.find((p) => p.user_id === VIEWER);

  const props = {
    params: { code: "ABC123" },
    form: null,
    data: {
      event,
      participants,
      items,
      currentParticipant,
      currentUserId: VIEWER,
      isHost: false,
      form: addForm,
      editForm,
      deleteForm,
      rsvpForm,
    },
  } as unknown as ComponentProps<typeof EventPage>;

  return render(EventPage, { props });
}

// The base locale is "fr", so paraglide renders French labels in tests.
// French translations: vegetarian → "Végétarien", vegan → "Vegan",
// gluten-free → "Sans gluten", contains-nuts → "Contient des noix",
// halal → "Halal"

describe("Dietary tag chips on the board", () => {
  it("renders tag chips for an item that has dietary tags", () => {
    renderEvent([
      makeItem({ dietary_tags: ["vegetarian", "gluten-free"] }),
    ]);

    // Both tags should appear as chip elements (French labels, base locale)
    expect(screen.getByText("Végétarien")).toBeInTheDocument();
    expect(screen.getByText("Sans gluten")).toBeInTheDocument();
  });

  it("renders no tag chips when dietary_tags is empty", () => {
    renderEvent([makeItem({ dietary_tags: [] })]);

    expect(screen.queryByText("Végétarien")).not.toBeInTheDocument();
    expect(screen.queryByText("Vegan")).not.toBeInTheDocument();
  });

  it("renders chip elements with data-dietary-tag attribute", () => {
    renderEvent([
      makeItem({ dietary_tags: ["vegan", "halal"] }),
    ]);

    const veganChip = document.querySelector('[data-dietary-tag="vegan"]');
    const halalChip = document.querySelector('[data-dietary-tag="halal"]');
    expect(veganChip).not.toBeNull();
    expect(halalChip).not.toBeNull();
  });

  it("renders items with no tags alongside items with tags", () => {
    renderEvent([
      makeItem({ id: "10", name: "Plat végé", dietary_tags: ["vegetarian"] }),
      makeItem({ id: "11", name: "Plat normal", participant: "p1", dietary_tags: [] }),
    ]);

    expect(screen.getByText("Plat végé")).toBeInTheDocument();
    expect(screen.getByText("Plat normal")).toBeInTheDocument();
    expect(screen.getByText("Végétarien")).toBeInTheDocument();
    // Only one Végétarien chip, not two
    expect(screen.getAllByText("Végétarien")).toHaveLength(1);
  });
});

describe("Add item dialog tag picker", () => {
  it("renders tag picker toggle buttons in the add dialog when opened", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderEvent();

    // Open the add dialog
    const addBtn = screen.getByText("Ajouter un item");
    await user.click(addBtn);

    // The dietary tags label should appear (French: "Tags alimentaires")
    expect(screen.getByText("Tags alimentaires")).toBeInTheDocument();

    // At least the vegetarian toggle button should be present (French: "Végétarien")
    const veganBtn = screen.getByRole("button", { name: /Végétarien/i });
    expect(veganBtn).toBeInTheDocument();
    expect(veganBtn).toHaveAttribute("aria-pressed", "false");
  });

  it("selecting a tag in the add dialog marks it as pressed", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderEvent();

    const addBtn = screen.getByText("Ajouter un item");
    await user.click(addBtn);

    const vegetarianBtn = screen.getByRole("button", { name: /Végétarien/i });
    expect(vegetarianBtn).toHaveAttribute("aria-pressed", "false");

    await user.click(vegetarianBtn);

    expect(vegetarianBtn).toHaveAttribute("aria-pressed", "true");
  });

  it("deselecting a tag toggles aria-pressed back to false", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderEvent();

    const addBtn = screen.getByText("Ajouter un item");
    await user.click(addBtn);

    const vegetarianBtn = screen.getByRole("button", { name: /Végétarien/i });

    // Select then deselect
    await user.click(vegetarianBtn);
    expect(vegetarianBtn).toHaveAttribute("aria-pressed", "true");

    await user.click(vegetarianBtn);
    expect(vegetarianBtn).toHaveAttribute("aria-pressed", "false");
  });
});

describe("Edit item dialog tag picker", () => {
  it("pre-fills the edit dialog with the item's existing dietary tags", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderEvent([
      makeItem({ dietary_tags: ["vegan", "contains-nuts"] }),
    ]);

    // Click the edit button for the item (the viewer owns item p2)
    const editBtn = screen.getByLabelText("Modifier");
    await user.click(editBtn);

    // Look for aria-pressed="true" buttons in the edit dialog
    // French: vegan → "Vegan", contains-nuts → "Contient des noix"
    const pressedBtns = screen
      .getAllByRole("button")
      .filter((b) => b.getAttribute("aria-pressed") === "true");

    const pressedLabels = pressedBtns.map((b) => b.textContent?.trim());
    expect(pressedLabels.some((l) => l?.includes("Vegan"))).toBe(true);
    expect(pressedLabels.some((l) => l?.includes("Contient des noix"))).toBe(true);
  });
});
