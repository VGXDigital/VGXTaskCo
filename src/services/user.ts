// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import { prisma } from '../lib/prisma.js';

/**
 * Seeds the three default saved views for a new user.
 * Wrap in try/catch — never throws.
 */
export async function seedDefaultViews(userId: string): Promise<void> {
  try {
    const defaults = [
      {
        name: 'My overdue',
        scope: 'user',
        filter: { dueWithin: 'overdue', includeArchived: false },
      },
      {
        name: 'This week',
        scope: 'user',
        filter: { dueWithin: 'thisWeek', includeArchived: false },
      },
      {
        name: 'Done in last 7 days',
        scope: 'user',
        filter: { dueWithin: 'doneInLast7Days', includeArchived: false },
      },
    ];

    await Promise.all(
      defaults.map((view) =>
        prisma.savedView.create({
          data: {
            name: view.name,
            ownerId: userId,
            scope: view.scope,
            projectId: null,
            filter: view.filter,
          },
        }),
      ),
    );
  } catch (err) {
    console.error('[user] Failed to seed default views:', err);
  }
}
