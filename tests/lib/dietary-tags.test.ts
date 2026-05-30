import { describe, it, expect } from "vite-plus/test";
import { VALID_DIETARY_TAGS } from "../../src/lib/types/index";

// ---------------------------------------------------------------------------
// Tag serialization / deserialization helpers
// (mirroring what parseTagsJson does in production code)
// ---------------------------------------------------------------------------

function serializeTags(tags: string[]): string {
  return JSON.stringify(tags);
}

function parseTagsJson(raw: string | null | undefined): string[] {
  try {
    const parsed = JSON.parse(raw ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((t) => (VALID_DIETARY_TAGS as readonly string[]).includes(t));
  } catch {
    return [];
  }
}

describe("Tag serialization / deserialization", () => {
  it("round-trips an empty tag list", () => {
    expect(parseTagsJson(serializeTags([]))).toEqual([]);
  });

  it("round-trips a full tag list", () => {
    const all = [...VALID_DIETARY_TAGS];
    expect(parseTagsJson(serializeTags(all))).toEqual(all);
  });

  it("round-trips a subset of tags", () => {
    const subset = ["vegetarian", "vegan", "gluten-free"];
    expect(parseTagsJson(serializeTags(subset))).toEqual(subset);
  });

  it("silently drops unknown / misspelled tag keys", () => {
    const withUnknown = JSON.stringify(["vegetarian", "unknown-tag", "vegan"]);
    expect(parseTagsJson(withUnknown)).toEqual(["vegetarian", "vegan"]);
  });

  it("rejects a non-array JSON value (returns empty)", () => {
    expect(parseTagsJson(JSON.stringify({ tag: "vegetarian" }))).toEqual([]);
  });

  it("handles a null input gracefully (returns empty)", () => {
    expect(parseTagsJson(null)).toEqual([]);
  });

  it("handles malformed JSON gracefully (returns empty)", () => {
    expect(parseTagsJson("not-json")).toEqual([]);
  });

  it("handles undefined gracefully (returns empty)", () => {
    expect(parseTagsJson(undefined)).toEqual([]);
  });
});

describe("VALID_DIETARY_TAGS vocabulary", () => {
  it("contains the expected tags", () => {
    expect(VALID_DIETARY_TAGS).toContain("vegetarian");
    expect(VALID_DIETARY_TAGS).toContain("vegan");
    expect(VALID_DIETARY_TAGS).toContain("gluten-free");
    expect(VALID_DIETARY_TAGS).toContain("contains-nuts");
    expect(VALID_DIETARY_TAGS).toContain("lactose-free");
    expect(VALID_DIETARY_TAGS).toContain("halal");
    expect(VALID_DIETARY_TAGS).toContain("kosher");
    expect(VALID_DIETARY_TAGS).toContain("spicy");
  });

  it("has no duplicate tags", () => {
    const unique = new Set(VALID_DIETARY_TAGS);
    expect(unique.size).toBe(VALID_DIETARY_TAGS.length);
  });
});
