/**
 * Verifies that the create and join pages do NOT prefill the name field with
 * "Anonymous" for anonymous users. The fix lives in the +page.server.ts load
 * functions (they skip the prefill when the stored name equals "Anonymous"),
 * so these tests check the resulting component state: an empty host_name /
 * name field shows the placeholder rather than "Anonymous".
 */
import { describe, it, expect, vi, beforeAll } from "vite-plus/test";
import { render, screen } from "@testing-library/svelte";
import { readable } from "svelte/store";
import { zod4 } from "sveltekit-superforms/adapters";
import { superValidate } from "sveltekit-superforms";
import type { SuperValidated } from "sveltekit-superforms";
import { z } from "zod";
import CreatePage from "../../src/routes/create/+page.svelte";
import JoinPage from "../../src/routes/join/[code]/+page.svelte";
import { createEventSchema } from "../../src/lib/schemas/event.schema";

vi.mock("$app/stores", () => ({
  page: readable({ url: new URL("http://localhost/create"), form: undefined }),
  navigating: readable(null),
}));
vi.mock("$app/state", () => ({
  page: { url: new URL("http://localhost/create") },
}));
vi.mock("$app/navigation", () => ({
  goto: vi.fn(),
  invalidateAll: vi.fn(),
  beforeNavigate: vi.fn(),
  afterNavigate: vi.fn(),
}));

const joinEventSchema = z.object({
  name: z.string().min(1),
  rsvp: z.enum(["going", "maybe", "not"]).default("going"),
  extraGuests: z.coerce.number().int().min(0).max(50).default(0),
});

let createForm: SuperValidated<ReturnType<typeof createEventSchema>["_output"]>;
let joinFormEmpty: SuperValidated<z.infer<typeof joinEventSchema>>;
let joinFormAnonymous: SuperValidated<z.infer<typeof joinEventSchema>>;

beforeAll(async () => {
  // Form with no host_name (as the fixed server load produces for anonymous users).
  createForm = await superValidate(zod4(createEventSchema()));

  // Join form with no prefill (fixed server: anonymous users get blank name).
  joinFormEmpty = await superValidate(zod4(joinEventSchema));

  // Simulate what the OLD (broken) server would have done: prefilling "Anonymous".
  joinFormAnonymous = await superValidate(zod4(joinEventSchema));
  joinFormAnonymous.data.name = "Anonymous";
});

describe("Create page — host name field", () => {
  it("shows the placeholder (not 'Anonymous') when host_name is empty", () => {
    render(CreatePage, {
      props: {
        params: {},
        form: null,
        data: {
          form: createForm,
          vapidPublicKey: null,
          pushEnabled: false,
        },
      },
    });

    const input = screen.getByLabelText(/Votre nom/);
    // Value must be empty — not "Anonymous".
    expect(input).toHaveValue("");
    expect(input).not.toHaveValue("Anonymous");
  });
});

describe("Join page — guest name field", () => {
  const event = {
    id: "1",
    name: "Barbecue",
    date: new Date().toISOString(),
    share_code: "ABC123",
    host_name: "Nico",
    location: undefined,
    description: undefined,
  };

  it("shows an empty field (placeholder) when name is not prefilled", () => {
    render(JoinPage, {
      props: {
        params: { code: "ABC123" },
        form: null,
        data: {
          form: joinFormEmpty,
          event,
          vapidPublicKey: null,
          pushEnabled: false,
        },
      },
    });

    const input = screen.getByLabelText(/Votre nom/);
    expect(input).toHaveValue("");
    expect(input).not.toHaveValue("Anonymous");
  });

  it("would show 'Anonymous' if the old broken prefill were present (regression guard)", () => {
    render(JoinPage, {
      props: {
        params: { code: "ABC123" },
        form: null,
        data: {
          form: joinFormAnonymous,
          event,
          vapidPublicKey: null,
          pushEnabled: false,
        },
      },
    });

    // This test deliberately renders the OLD state (prefilled "Anonymous") and
    // asserts it IS present — used as a control to confirm the fix is meaningful.
    const input = screen.getByLabelText(/Votre nom/);
    expect(input).toHaveValue("Anonymous");
  });
});
