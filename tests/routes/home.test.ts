import { describe, it, expect, vi, beforeAll } from "vite-plus/test";
import { render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { readable } from "svelte/store";
import { z } from "zod";
import { zod4 } from "sveltekit-superforms/adapters";
import { superValidate } from "sveltekit-superforms";
import type { SuperValidated } from "sveltekit-superforms";
import HomePage from "../../src/routes/+page.svelte";

// `superForm` (used inside the page) reads the SvelteKit navigation/page
// stores and calls navigation helpers. Outside a running SvelteKit app the real
// `page` store throws on URL resolution, so we provide minimal stand-ins for
// exactly the exports superForm consumes.
vi.mock("$app/stores", () => ({
  page: readable({ url: new URL("http://localhost/"), form: undefined }),
  navigating: readable(null),
}));

// The locale switcher reads `page.url.pathname` from `$app/state`; provide a
// real URL so paraglide's `localizeHref`/`resolve` get an absolute pathname.
vi.mock("$app/state", () => ({
  page: { url: new URL("http://localhost/") },
}));

vi.mock("$app/navigation", () => ({
  goto: vi.fn(),
  invalidateAll: vi.fn(),
  beforeNavigate: vi.fn(),
  afterNavigate: vi.fn(),
}));

const shareCodeSchema = z.object({
  shareCode: z.string().min(1).max(6).toUpperCase(),
});

// Build a real superForm payload matching what `+page.server.ts` returns, so
// the component renders exactly as it does in production.
let joinForm: SuperValidated<{ shareCode: string }>;

beforeAll(async () => {
  joinForm = await superValidate(zod4(shareCodeSchema));
});

function renderHome() {
  return render(HomePage, {
    props: {
      // `PageProps` also requires `params` and `form`; the component only reads
      // `data`, but we supply them so the props satisfy the generated type.
      params: {},
      form: null,
      data: {
        hosted: [],
        joined: [],
        joinForm,
        user: null,
      },
    },
  });
}

describe("Home Page Component", () => {
  describe("Rendering", () => {
    it("should render app title", () => {
      renderHome();

      const title = screen.getByRole("heading", { name: "Popote" });
      expect(title).toBeInTheDocument();
    });

    it("should render app description", () => {
      renderHome();

      const description = screen.getByText(
        "Organisation de repas collaboratifs",
      );
      expect(description).toBeInTheDocument();
    });

    it("should render create event card", () => {
      renderHome();

      // "Créer une soirée" is used for both the card heading and the CTA
      // label, so target the heading by role to disambiguate.
      const createTitle = screen.getByRole("heading", {
        name: "Créer une soirée",
      });
      expect(createTitle).toBeInTheDocument();

      const createDescription = screen.getByText(
        "Organisez un repas et invitez vos amis",
      );
      expect(createDescription).toBeInTheDocument();
    });

    it("should render join event card", () => {
      renderHome();

      const joinTitle = screen.getByText("Rejoindre une soirée");
      expect(joinTitle).toBeInTheDocument();

      const joinDescription = screen.getByText(
        "Entrez le code partagé par l'hôte",
      );
      expect(joinDescription).toBeInTheDocument();
    });
  });

  describe("Create Event Button", () => {
    it("should have link to create page", () => {
      renderHome();

      const createButton = screen.getByRole("link", {
        name: /créer une soirée/i,
      });
      expect(createButton).toHaveAttribute("href", "/create");
    });
  });

  describe("Join Event Form", () => {
    it("should render share code input", () => {
      renderHome();

      const input = screen.getByLabelText("Code de partage");
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute("placeholder", "ABC123");
      expect(input).toHaveAttribute("maxlength", "8");
    });

    it("should have uppercase class on input", () => {
      renderHome();

      const input = screen.getByLabelText("Code de partage");
      expect(input).toHaveClass("uppercase");
    });

    it("should render join button", () => {
      renderHome();

      const button = screen.getByRole("button", { name: /rejoindre/i });
      expect(button).toBeInTheDocument();
    });

    it("should disable join button when share code is empty", () => {
      renderHome();

      const button = screen.getByRole("button", { name: /rejoindre/i });
      expect(button).toBeDisabled();
    });
  });

  describe("User Interaction", () => {
    it("should enable the join button after typing a share code", async () => {
      const user = userEvent.setup();
      renderHome();

      const input = screen.getByLabelText("Code de partage");
      const button = screen.getByRole("button", { name: /rejoindre/i });

      // Initially disabled because the bound share-code value is empty.
      expect(button).toBeDisabled();

      await user.type(input, "ABC123");

      // The button's `disabled` is driven by the two-way bound form value, so
      // typing into the real input must enable it.
      expect(input).toHaveValue("ABC123");
      expect(button).toBeEnabled();
    });

    it("should disable the join button again when the share code is cleared", async () => {
      const user = userEvent.setup();
      renderHome();

      const input = screen.getByLabelText("Code de partage");
      const button = screen.getByRole("button", { name: /rejoindre/i });

      await user.type(input, "ABC123");
      expect(button).toBeEnabled();

      await user.clear(input);
      expect(input).toHaveValue("");
      expect(button).toBeDisabled();
    });
  });
});
