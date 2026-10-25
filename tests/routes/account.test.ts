import { describe, it, expect, vi, beforeAll } from "vite-plus/test";
import { render, screen } from "@testing-library/svelte";
import userEvent from "@testing-library/user-event";
import { z } from "zod";
import { zod4 } from "sveltekit-superforms/adapters";
import { superValidate } from "sveltekit-superforms";
import type { SuperValidated } from "sveltekit-superforms";
import { APIError } from "better-auth/api";
import AccountPage from "../../src/routes/account/+page.svelte";
import { actions } from "../../src/routes/account/+page.server";

// `superForm` and the locale switcher read `page` and `navigating` from
// `$app/state` and call navigation helpers. Outside a running SvelteKit app the
// real `page` state throws on URL resolution, so we provide minimal stand-ins.
vi.mock("$app/state", () => ({
  page: { url: new URL("http://localhost/account"), form: undefined },
  navigating: null,
}));

vi.mock("$app/server", () => ({
  getRequestEvent: vi.fn(),
}));

vi.mock("$app/navigation", () => ({
  goto: vi.fn(),
  invalidateAll: vi.fn(),
  refreshAll: vi.fn(),
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
      data: {
        user,
        signUpForm,
        signInForm,
        // Provided by the root layout load; the component ignores them.
        vapidPublicKey: null,
        pushEnabled: false,
      },
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

  describe("Login error display", () => {
    it("renders a sign-in API error message when the sign-in form has a message", () => {
      // Simulate the superforms message returned by message(form, err.message, {status:400})
      const formWithError = {
        ...signInForm,
        message: "INVALID_EMAIL_OR_PASSWORD",
      };
      render(AccountPage, {
        props: {
          params: {},
          form: null,
          data: {
            user: null,
            signUpForm,
            signInForm: formWithError,
            vapidPublicKey: null,
            pushEnabled: false,
          },
        },
      });

      // Switch to the sign-in tab first
      const signInTab = screen.getByRole("tab", { name: "Se connecter" });
      // Activate the tab (click or set value)
      expect(signInTab).toBeInTheDocument();

      // The error message should appear in the sign-in form area
      expect(screen.getByText("INVALID_EMAIL_OR_PASSWORD")).toBeInTheDocument();
    });

    it("renders a sign-up API error when the sign-up form has a message", () => {
      const formWithError = { ...signUpForm, message: "Email déjà utilisé" };
      render(AccountPage, {
        props: {
          params: {},
          form: null,
          data: {
            user: null,
            signUpForm: formWithError,
            signInForm,
            vapidPublicKey: null,
            pushEnabled: false,
          },
        },
      });

      expect(screen.getByText("Email déjà utilisé")).toBeInTheDocument();
    });
  });

  describe("Server actions — password clearing on error", () => {
    function makeFormRequest(fields: Record<string, string>): Request {
      const fd = new FormData();
      for (const [k, v] of Object.entries(fields)) {
        fd.set(k, v);
      }
      return new Request("http://localhost/account", {
        method: "POST",
        body: fd,
      });
    }

    it("clears form.data.password on signUp validation failure while preserving name and email", async () => {
      const request = makeFormRequest({
        name: "Marie",
        email: "marie@example.fr",
        password: "short",
      });
      const result = (await actions.signUp({
        request,
        locals: {} as App.Locals,
      } as never)) as { status: number; data: { form: { data: { name: string; email: string; password: string } } } };

      expect(result.status).toBe(400);
      expect(result.data.form.data.name).toBe("Marie");
      expect(result.data.form.data.email).toBe("marie@example.fr");
      expect(result.data.form.data.password).toBe("");
    });

    it("clears form.data.password on signUp APIError while preserving name and email", async () => {
      const request = makeFormRequest({
        name: "Marie",
        email: "marie@example.fr",
        password: "super-secret-password",
      });
      const locals = {
        auth: {
          api: {
            signUpEmail: vi.fn().mockRejectedValue(
              new APIError("UNPROCESSABLE_ENTITY", {
                code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL",
                message: "User already exists",
              }),
            ),
          },
        },
      } as unknown as App.Locals;

      const result = (await actions.signUp({
        request,
        locals,
      } as never)) as { status: number; data: { form: { data: { name: string; email: string; password: string }; message?: string } } };

      expect(result.status).toBe(400);
      expect(result.data.form.data.name).toBe("Marie");
      expect(result.data.form.data.email).toBe("marie@example.fr");
      expect(result.data.form.data.password).toBe("");
    });

    it("clears form.data.password on signIn validation failure while preserving email", async () => {
      const request = makeFormRequest({
        email: "not-an-email",
        password: "super-secret-password",
      });
      const result = (await actions.signIn({
        request,
        locals: {} as App.Locals,
      } as never)) as { status: number; data: { form: { data: { email: string; password: string } } } };

      expect(result.status).toBe(400);
      expect(result.data.form.data.email).toBe("not-an-email");
      expect(result.data.form.data.password).toBe("");
    });

    it("clears form.data.password on signIn APIError while preserving email", async () => {
      const request = makeFormRequest({
        email: "marie@example.fr",
        password: "wrong-password-123",
      });
      const locals = {
        auth: {
          api: {
            signInEmail: vi.fn().mockRejectedValue(
              new APIError("UNAUTHORIZED", {
                code: "INVALID_EMAIL_OR_PASSWORD",
                message: "Invalid email or password",
              }),
            ),
          },
        },
      } as unknown as App.Locals;

      const result = (await actions.signIn({
        request,
        locals,
      } as never)) as { status: number; data: { form: { data: { email: string; password: string }; message?: string } } };

      expect(result.status).toBe(400);
      expect(result.data.form.data.email).toBe("marie@example.fr");
      expect(result.data.form.data.password).toBe("");
    });
  });
});
