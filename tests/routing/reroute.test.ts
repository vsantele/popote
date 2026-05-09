import { describe, expect, it } from "vite-plus/test";

describe("localized reroute hook", () => {
  it("maps localized English URLs back to the underlying route", async () => {
    const hooks = await import("../../src/hooks.js");

    expect(hooks.reroute).toBeTypeOf("function");

    const reroutedPath = hooks.reroute({
      url: new URL("https://example.com/en/account"),
      fetch: fetch,
    });

    expect(reroutedPath).toBe("/account");
  });
});
