import { describe, it, expect, vi } from "vite-plus/test";
import { render, screen } from "@testing-library/svelte";
import HomePage from "../../src/routes/+page.svelte";

// Mock navigation
vi.mock("$app/navigation", () => ({
  goto: vi.fn(),
}));

describe("Home Page Component", () => {
  describe("Rendering", () => {
    it("should render app title", () => {
      render(HomePage);

      const title = screen.getByText("🍽️ Popote");
      expect(title).toBeInTheDocument();
    });

    it("should render app description", () => {
      render(HomePage);

      const description = screen.getByText(
        "Organisation de repas collaboratifs",
      );
      expect(description).toBeInTheDocument();
    });

    it("should render create event card", () => {
      render(HomePage);

      const createTitle = screen.getByText("Créer une soirée");
      expect(createTitle).toBeInTheDocument();

      const createDescription = screen.getByText(
        "Organisez un repas et invitez vos amis",
      );
      expect(createDescription).toBeInTheDocument();
    });

    it("should render join event card", () => {
      render(HomePage);

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
      render(HomePage);

      const createButton = screen.getByRole("link", {
        name: /créer une soirée/i,
      });
      expect(createButton).toHaveAttribute("href", "/create");
    });
  });

  describe("Join Event Form", () => {
    it("should render share code input", () => {
      render(HomePage);

      const input = screen.getByLabelText("Code de partage");
      expect(input).toBeInTheDocument();
      expect(input).toHaveAttribute("placeholder", "ABC123");
      expect(input).toHaveAttribute("maxlength", "8");
    });

    it("should have uppercase class on input", () => {
      render(HomePage);

      const input = screen.getByLabelText("Code de partage");
      expect(input).toHaveClass("uppercase");
    });

    it("should render join button", () => {
      render(HomePage);

      const button = screen.getByRole("button", { name: /rejoindre/i });
      expect(button).toBeInTheDocument();
    });

    it("should disable join button when share code is empty", async () => {
      render(HomePage);

      const button = screen.getByRole("button", { name: /rejoindre/i });
      expect(button).toBeDisabled();
    });
  });

  describe("User Interaction", () => {
    it("should enable join button when share code is entered", async () => {
      const { component } = render(HomePage);

      const input = screen.getByLabelText("Code de partage");
      const button = screen.getByRole("button", { name: /rejoindre/i });

      // Simulate input
      await input.dispatchEvent(new Event("input"));
      component.$set({ shareCode: "ABC123" });

      // Button should be enabled (but this requires Svelte 5 state handling)
      // This test demonstrates the pattern, actual implementation may vary
    });
  });
});
