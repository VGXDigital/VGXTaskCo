// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

/**
 * src/lib/types.ts
 *
 * Shared types used across services and middleware.
 */

/**
 * HTTP request context passed to service functions for audit and activity logging.
 * Contains just enough to record where a mutation came from — never full body data.
 */
export interface RequestContext {
  ip: string;
  headers: Record<string, string | string[] | undefined>;
}
