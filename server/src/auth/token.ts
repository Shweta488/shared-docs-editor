import { createHmac, timingSafeEqual } from 'node:crypto';

// A small signed token: base64url(JSON payload) + "." + base64url(HMAC-SHA256).
// Enough to prove who is calling without a JWT library.

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface Payload {
  sub: string;
  exp: number;
}

function sign(data: string, secret: string): string {
  return createHmac('sha256', secret).update(data).digest('base64url');
}

export function createToken(userId: string, secret: string, now = Date.now()): string {
  const payload: Payload = { sub: userId, exp: now + TOKEN_TTL_MS };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${data}.${sign(data, secret)}`;
}

/** Returns the user ID, or null if the token is malformed, tampered with, or expired. */
export function verifyToken(token: string, secret: string, now = Date.now()): string | null {
  const [data, signature, extra] = token.split('.');
  if (!data || !signature || extra !== undefined) return null;

  const expected = Buffer.from(sign(data, secret));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;

  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString()) as Partial<Payload>;
    if (typeof payload.sub !== 'string' || typeof payload.exp !== 'number') return null;
    return payload.exp > now ? payload.sub : null;
  } catch {
    return null;
  }
}
