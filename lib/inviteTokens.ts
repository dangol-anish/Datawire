import crypto from "crypto";

const DEFAULT_SALT = process.env.INVITE_TOKEN_SALT || process.env.NEXTAUTH_SECRET;

export function generateInviteToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashInviteToken(token: string) {
  if (!DEFAULT_SALT) {
    throw new Error("Missing INVITE_TOKEN_SALT or NEXTAUTH_SECRET");
  }
  return crypto
    .createHash("sha256")
    .update(`${token}:${DEFAULT_SALT}`)
    .digest("hex");
}

