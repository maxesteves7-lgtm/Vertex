import crypto from "node:crypto";
import { prisma } from "./prisma";

/**
 * API key management. Full key is `fk_` + 32 random hex chars. We store
 * only the SHA-256 hash + the first 12 chars (as a display prefix) so
 * validating an incoming Bearer token is O(1) via the hash index and no
 * plaintext ever hits the database.
 *
 * Key format: fk_<32 hex>
 * Example:    fk_c14e6e466b2a24bc09edd6f8267ac9d2
 */

const PREFIX = "fk_";

export type IssuedKey = {
  id: string;
  name: string;
  /** Full plaintext — returned ONCE at creation time only. */
  key: string;
  /** Display-safe prefix, e.g. "fk_c14e6e..." */
  keyPrefix: string;
  createdAt: string;
};

export type StoredKey = {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

export function generateKey(): string {
  return PREFIX + crypto.randomBytes(16).toString("hex");
}

export function hashKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

/** Preview shown in the account UI — full key is only visible once. */
export function displayPrefix(key: string): string {
  return `${key.slice(0, 12)}…`;
}

/**
 * Create + persist a new API key for a user. Returns the full plaintext
 * ONCE — the caller must show it to the user immediately (it will never
 * be retrievable again).
 */
export async function issueKey(
  userEmail: string,
  name: string,
): Promise<IssuedKey> {
  const key = generateKey();
  const keyHash = hashKey(key);
  const keyPrefix = displayPrefix(key);
  const row = await prisma.apiKey.create({
    data: { userEmail, name: name.trim() || "Untitled", keyHash, keyPrefix },
  });
  return {
    id: row.id,
    name: row.name,
    key,
    keyPrefix,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listKeys(userEmail: string): Promise<StoredKey[]> {
  const rows = await prisma.apiKey.findMany({
    where: { userEmail },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    keyPrefix: r.keyPrefix,
    lastUsedAt: r.lastUsedAt?.toISOString() ?? null,
    revokedAt: r.revokedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function revokeKey(userEmail: string, id: string): Promise<void> {
  await prisma.apiKey.updateMany({
    where: { id, userEmail, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/**
 * Resolve an incoming Authorization: Bearer token to a user email, or
 * null if invalid/revoked. Also touches `lastUsedAt` on success so users
 * can see which keys are being used from the account page.
 */
export async function resolveBearer(bearer: string): Promise<string | null> {
  const trimmed = bearer.replace(/^Bearer\s+/i, "").trim();
  if (!trimmed.startsWith(PREFIX)) return null;
  const keyHash = hashKey(trimmed);
  const row = await prisma.apiKey.findUnique({ where: { keyHash } });
  if (!row || row.revokedAt) return null;
  // Fire-and-forget touch of lastUsedAt
  prisma.apiKey
    .update({ where: { id: row.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {
      /* non-fatal */
    });
  return row.userEmail;
}
