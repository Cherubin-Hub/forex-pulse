import "server-only";
import { timingSafeEqual } from "node:crypto";
export function hasSecretAuthorization(
  headers: Headers,
  secret: string | undefined,
): boolean {
  const expected = secret?.trim();
  const supplied = headers.get("authorization");
  if (!expected || !supplied) return false;
  const left = Buffer.from(supplied),
    right = Buffer.from(`Bearer ${expected}`);
  return left.length === right.length && timingSafeEqual(left, right);
}
