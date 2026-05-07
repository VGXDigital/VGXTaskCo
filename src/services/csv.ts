// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

/**
 * RFC 4180 CSV utilities. No third-party library.
 */

/**
 * Quotes a CSV field if it contains a comma, double-quote, or newline.
 * Doubles any internal double-quotes per RFC 4180.
 */
export function escapeField(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Joins escaped fields with commas and appends CRLF per RFC 4180.
 */
export function rowToCSV(fields: string[]): string {
  return fields.map(escapeField).join(',') + '\r\n';
}

export const TASK_CSV_HEADERS: string[] = [
  'id',
  'project',
  'title',
  'description',
  'status',
  'priority',
  'dueDate',
  'createdAt',
  'updatedAt',
];
