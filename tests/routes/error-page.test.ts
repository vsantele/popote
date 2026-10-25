import { describe, expect, it, vi } from "vite-plus/test";
import { render, screen } from "@testing-library/svelte";
import { page } from "$app/state";
import { getErrorPageVariant } from "../../src/lib/error-page";
import ErrorPage from "../../src/routes/+error.svelte";

// +error.svelte reads page.status from $app/state (not from $props).
// We mock the module so tests can control the status value per describe block.
vi.mock("$app/state", () => ({
  page: {
    status: 404,
    error: null as unknown,
    url: new URL("http://localhost/missing"),
  },
}));

vi.mock("$app/navigation", () => ({
  goto: vi.fn(),
  invalidateAll: vi.fn(),
  refreshAll: vi.fn(),
  beforeNavigate: vi.fn(),
  afterNavigate: vi.fn(),
}));

describe("getErrorPageVariant", () => {
  it("maps 404 responses to the not-found experience", () => {
    expect(getErrorPageVariant(404)).toBe("not-found");
  });

  it("maps 500 responses to the server-error experience", () => {
    expect(getErrorPageVariant(500)).toBe("server-error");
  });
});

describe("+error.svelte component", () => {
  it("shows the not-found variant when page.status is 404", () => {
    (page as any).status = 404;
    (page as any).error = null;
    render(ErrorPage, { props: {} });

    // The not-found badge text is unique to the 404 variant.
    expect(screen.getByText("Vous êtes perdu ?")).toBeInTheDocument();
    expect(screen.getByText("Page introuvable")).toBeInTheDocument();
    // The server-error badge must NOT appear.
    expect(
      screen.queryByText("Quelque chose s'est mal passé"),
    ).not.toBeInTheDocument();
  });

  it("shows the server-error variant when page.status is 500", () => {
    (page as any).status = 500;
    (page as any).error = { message: "Internal Error" };
    render(ErrorPage, { props: {} });

    expect(
      screen.getByText("Quelque chose s'est mal passé"),
    ).toBeInTheDocument();
    expect(screen.getByText("Erreur du serveur")).toBeInTheDocument();
    expect(screen.getByText("500")).toBeInTheDocument();
    expect(screen.getByText("Internal Error")).toBeInTheDocument();
    expect(screen.queryByText("Vous êtes perdu ?")).not.toBeInTheDocument();
  });
});
