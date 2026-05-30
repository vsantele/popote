import { describe, it, expect, vi, beforeAll } from "vite-plus/test"
import { render, screen } from "@testing-library/svelte"
import userEvent from "@testing-library/user-event"
import { readable } from "svelte/store"
import { zod4 } from "sveltekit-superforms/adapters"
import { superValidate } from "sveltekit-superforms"
import {
  addItemSchema,
  editItemSchema,
  deleteItemSchema,
} from "../../src/lib/schemas/item.schema"
import { rsvpSchema } from "../../src/lib/schemas/rsvp.schema"
import EventPage from "../../src/routes/e/[code]/+page.svelte"
import type { ComponentProps } from "svelte"

vi.mock("$app/stores", () => ({
  page: readable({ url: new URL("http://localhost/e/ABC123"), form: undefined }),
  navigating: readable(null),
}))

vi.mock("$app/state", () => ({
  page: { url: new URL("http://localhost/e/ABC123") },
}))

vi.mock("$app/navigation", () => ({
  goto: vi.fn(),
  invalidateAll: vi.fn(),
  beforeNavigate: vi.fn(),
  afterNavigate: vi.fn(),
}))

const HOST = "user-host"

let addForm: unknown
let editForm: unknown
let deleteForm: unknown
let rsvpForm: unknown

beforeAll(async () => {
  addForm = await superValidate(zod4(addItemSchema()))
  editForm = await superValidate(zod4(editItemSchema()))
  deleteForm = await superValidate(zod4(deleteItemSchema()))
  rsvpForm = await superValidate(zod4(rsvpSchema()))
})

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
  }

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
  ]

  const props = {
    params: { code: "ABC123" },
    form: null,
    data: {
      event,
      participants,
      items: [],
      currentParticipant: undefined,
      currentUserId: null,
      isHost: false,
      form: addForm,
      editForm,
      deleteForm,
      rsvpForm,
    },
  } as unknown as ComponentProps<typeof EventPage>

  return render(EventPage, { props })
}

describe("QR code dialog", () => {
  it("renders the QR trigger button", () => {
    renderEvent()
    const trigger = screen.getByTestId("qr-trigger")
    expect(trigger).toBeInTheDocument()
    expect(trigger).toHaveAttribute("aria-label", "Afficher le QR code")
  })

  it("opens the QR dialog when the trigger button is clicked", async () => {
    renderEvent()
    // pointerEventsCheck disabled: opening a bits-ui Dialog in a prior test
    // leaves `pointer-events: none` on document.body (scroll-lock) which can
    // outlive cleanup and falsely block the trigger click in jsdom.
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    const trigger = screen.getByTestId("qr-trigger")

    // Dialog should not be visible before clicking
    expect(screen.queryByTestId("qr-code")).not.toBeInTheDocument()

    await user.click(trigger)

    // Dialog should now be open and contain the QR element
    const qrCode = screen.getByTestId("qr-code")
    expect(qrCode).toBeInTheDocument()
  })

  it("QR element in the dialog contains SVG markup (rendered QR code)", async () => {
    renderEvent()
    // pointerEventsCheck disabled: opening a bits-ui Dialog in a prior test
    // leaves `pointer-events: none` on document.body (scroll-lock) which can
    // outlive cleanup and falsely block the trigger click in jsdom.
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    const trigger = screen.getByTestId("qr-trigger")
    await user.click(trigger)

    const qrCode = screen.getByTestId("qr-code")
    // The QR library renders an <svg> inside the container
    const svg = qrCode.querySelector("svg")
    expect(svg).not.toBeNull()
  })

  it("shows the encoded event URL text below the QR code in the dialog", async () => {
    renderEvent()
    // pointerEventsCheck disabled: opening a bits-ui Dialog in a prior test
    // leaves `pointer-events: none` on document.body (scroll-lock) which can
    // outlive cleanup and falsely block the trigger click in jsdom.
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    const trigger = screen.getByTestId("qr-trigger")
    await user.click(trigger)

    // The full URL (origin + localized path) is displayed below the QR image
    // The mocked page.url.origin is "http://localhost" and the share code is "ABC123"
    const qrCode = screen.getByTestId("qr-code")
    const urlText = qrCode.parentElement?.querySelector("p")
    expect(urlText?.textContent).toMatch(/ABC123/)
  })
})
