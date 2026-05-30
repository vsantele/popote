import { describe, it, expect, vi, beforeAll } from "vite-plus/test";
import { render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { readable } from "svelte/store";
import { z } from "zod";
import { zod4 } from "sveltekit-superforms/adapters";
import { superValidate } from "sveltekit-superforms";
import type { SuperValidated } from "sveltekit-superforms";
import AccountPage from "../../src/routes/account/+page.svelte";

// `superForm` (used inside the page) reads the SvelteKit navigation/page
// stores and calls navigation helpers. Outside a running SvelteKit app the
// real `page` store throws on URL resolution, so we provide minimal
// stand-ins for exactly the exports superForm consumes.
vi.mock("$app/stores", () => ({
  page: readable({ url: new URL("http://localhost/account"), form: undefined }),
  navigating: readable(null),
}));

// The locale switcher reads `page.url.pathname` from `$app/state`; provide a
// real URL so paraglide's `localizeHref`/`resolve` get an absolute pathname.
vi.mock("$app/state", () => ({
  page: { url: new URL("http://localhost/account") },
}));

vi.mock("$app/navigation", () => ({
  goto: vi.fn(),
  invalidateAll: vi.fn(),
  beforeNavigate: vi.fn(),
  afterNavigate: vi.fn(),
}));

const signUpSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.email(),
  password: z.string().min(8),
});

const signInSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

type User = {
  id: string;
  name: string;
  email: string;
  isAnonymous: boolean;
};

let signUpForm: SuperValidated<z.infer<typeof signUpSchema>>;
let signInForm: SuperValidated<z.infer<typeof signInSchema>>;

beforeAll(async () => {
  signUpForm = await superValidate(zod4(signUpSchema), { id: "signUp" });
  signInForm = await superValidate(zod4(signInSchema), { id: "signIn" });
});

function renderAccount(user: User | null) {
  return render(AccountPage, {
    props: {
      params: {},
      form: null,
      data: { user, signUpForm, signInForm },
    },
  });
}

describe("Account Page Component", () => {
  describe("Logged-out state", () => {
    it("shows the guest heading and the logged-out intro", () => {
      renderAccount(null);

      expect(
        screen.getByRole("heading", { name: "Bienvenue" }),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          "Connectez-vous ou créez un compte pour retrouver vos soirées.",
        ),
      ).toBeInTheDocument();
    });

    it("renders both tabs as a single segmented control", () => {
      renderAccount(null);

      const tabs = screen.getAllByRole("tab");
      expect(tabs).toHaveLength(2);
      expect(
        screen.getByRole("tab", { name: "Créer un compte" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("tab", { name: "Se connecter" }),
      ).toBeInTheDocument();
    });

    it("defaults to the create-account tab and shows its labelled fields", () => {
      renderAccount(null);

      // Sign-up tab is selected by default.
      expect(
        screen.getByRole("tab", { name: "Créer un compte", selected: true }),
      ).toBeInTheDocument();

      // Its fields (with real labels) are visible.
      expect(screen.getByLabelText("Votre nom *")).toBeInTheDocument();
      expect(screen.getByLabelText("Email *")).toBeInTheDocument();
      expect(screen.getByLabelText("Mot de passe *")).toBeInTheDocument();
    });

    it("does not show the carry-over note when there is no guest session", () => {
      renderAccount(null);

      expect(
        screen.queryByText(/resteront liés à votre compte/),
      ).not.toBeInTheDocument();
    });

    it("switches to the sign-in form when the sign-in tab is activated", async () => {
      const user = userEvent.setup();
      renderAccount(null);

      const signInTab = screen.getByRole("tab", { name: "Se connecter" });
      await user.click(signInTab);

      expect(signInTab).toHaveAttribute("aria-selected", "true");
      // The sign-in email label is distinct from the sign-up "Email *" label.
      expect(screen.getByLabelText("Email")).toBeInTheDocument();
    });
  });

  describe("Anonymous / guest state", () => {
    const guest: User = {
      id: "anon-123",
      name: "Invité",
      email: "",
      isAnonymous: true,
    };

    it("emphasizes creating an account and shows the carry-over reassurance", () => {
      renderAccount(guest);

      expect(
        screen.getByText(
          "Créez un compte pour garder vos soirées et les retrouver sur tous vos appareils.",
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByText(/resteront liés à votre compte/),
      ).toBeInTheDocument();
    });

    it("defaults to the create-account tab for guests", () => {
      renderAccount(guest);

      expect(
        screen.getByRole("tab", { name: "Créer un compte", selected: true }),
      ).toBeInTheDocument();
    });
  });

  describe("Signed-in real user state", () => {
    const realUser: User = {
      id: "user-456",
      name: "Marie",
      email: "marie@example.fr",
      isAnonymous: false,
    };

    it("shows the account heading, name, email and sign-out button", () => {
      renderAccount(realUser);

      expect(
        screen.getByRole("heading", { name: "Mon compte" }),
      ).toBeInTheDocument();
      expect(screen.getByText("Marie")).toBeInTheDocument();
      expect(screen.getByText("marie@example.fr")).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Se déconnecter" }),
      ).toBeInTheDocument();
    });

    it("does not render the auth tabs when signed in", () => {
      renderAccount(realUser);

      expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    });
  });
});
