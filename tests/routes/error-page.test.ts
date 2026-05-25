import { describe, expect, it } from "vite-plus/test";
import { getErrorPageVariant } from "../../src/lib/error-page";

describe("root error page", () => {
  it("maps 404 responses to the not-found experience", () => {
    expect(getErrorPageVariant(404)).toBe("not-found");
  });

  it("maps 500 responses to the server-error experience", () => {
    expect(getErrorPageVariant(500)).toBe("server-error");
  });
});
