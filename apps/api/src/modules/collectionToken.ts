import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const COLLECTION_TOKEN_TTL_MS = 10 * 60 * 1000;

export function hashCollectionToken(token: string, secret: string): string {
  return createHmac("sha256", secret).update(token).digest("hex");
}

export function createCollectionToken(secret: string, now = new Date()) {
  const token = randomBytes(32).toString("base64url");
  return {
    token,
    tokenHash: hashCollectionToken(token, secret),
    expiresAt: new Date(now.getTime() + COLLECTION_TOKEN_TTL_MS),
  };
}

export function isCollectionTokenUsable(record: {
  tokenHash: string;
  volunteerId: string;
  expiresAt: Date;
  usedAt: Date | null;
  revokedAt: Date | null;
}, token: string, secret: string, volunteerId: string, now = new Date()): boolean {
  const suppliedHash = hashCollectionToken(token, secret);
  const storedHash = Buffer.from(record.tokenHash, "hex");
  const supplied = Buffer.from(suppliedHash, "hex");
  const hashMatches = storedHash.length === supplied.length && timingSafeEqual(storedHash, supplied);
  return hashMatches && record.volunteerId === volunteerId && record.expiresAt > now && !record.usedAt && !record.revokedAt;
}
