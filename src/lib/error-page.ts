export type ErrorPageVariant = "not-found" | "server-error";

export function getErrorPageVariant(status: number): ErrorPageVariant {
  return status === 404 ? "not-found" : "server-error";
}
