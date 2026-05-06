// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import { SignJWT, jwtVerify } from 'jose';
import { env } from './env.js';

const ALG = 'HS256';

function getSecret(): Uint8Array {
  return new TextEncoder().encode(env.JWT_SECRET);
}

/**
 * Signs a JWT with HS256. Default expiry: 7 days.
 */
export async function signJwt(
  payload: { userId: string },
  expiresIn = '7d',
): Promise<string> {
  return new SignJWT({ userId: payload.userId })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getSecret());
}

/**
 * Verifies a JWT and returns the userId claim.
 * Throws on invalid/expired token — callers should catch.
 */
export async function verifyJwt(token: string): Promise<{ userId: string }> {
  const { payload } = await jwtVerify(token, getSecret(), { algorithms: [ALG] });

  if (typeof payload['userId'] !== 'string') {
    throw new Error('Invalid token payload: missing userId');
  }

  return { userId: payload['userId'] };
}
