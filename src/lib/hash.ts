// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 12;

/**
 * Hashes a plain-text password using bcrypt with cost factor 12.
 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

/**
 * Verifies a plain-text password against a bcrypt hash.
 * Returns false on any error rather than throwing.
 */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}
