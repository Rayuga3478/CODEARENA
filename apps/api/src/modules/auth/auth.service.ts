import * as argon2 from 'argon2';
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { randomBytes, createHash } from 'crypto';
import { getEnv } from '../../config/index.js';

// ─── Password Hashing ────────────────────────────────────────────────────────

/**
 * Hash a password using Argon2id.
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,
    parallelism: 4,
  });
}

/**
 * Verify a password against an Argon2id hash.
 */
export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  return argon2.verify(hash, password);
}

// ─── JWT Tokens ──────────────────────────────────────────────────────────────

export interface AccessTokenPayload extends JWTPayload {
  sub: string; // userId
  role: string;
  handle: string;
}

/**
 * Create a short-lived JWT access token.
 */
export async function createAccessToken(payload: {
  userId: string;
  role: string;
  handle: string;
}): Promise<string> {
  const env = getEnv();
  const secret = new TextEncoder().encode(env.JWT_SECRET);

  return new SignJWT({
    sub: payload.userId,
    role: payload.role,
    handle: payload.handle,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(env.JWT_ACCESS_EXPIRY)
    .sign(secret);
}

/**
 * Verify and decode a JWT access token.
 */
export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  const env = getEnv();
  const secret = new TextEncoder().encode(env.JWT_SECRET);

  const { payload } = await jwtVerify(token, secret);
  return payload as AccessTokenPayload;
}

// ─── Refresh Tokens ──────────────────────────────────────────────────────────

/**
 * Generate a cryptographically secure refresh token.
 */
export function generateRefreshToken(): string {
  return randomBytes(40).toString('hex');
}

/**
 * Hash a refresh token for storage using SHA-256.
 * We never store raw refresh tokens in the database.
 */
export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// ─── Email Verification & Password Reset ─────────────────────────────────────

/**
 * Generate a cryptographically secure token for email verification or password reset.
 */
export function generateSecureToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Hash a secure token for storage.
 */
export function hashSecureToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// ─── Cookie Configuration ────────────────────────────────────────────────────

export function getRefreshCookieOptions() {
  const env = getEnv();
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  };
}
