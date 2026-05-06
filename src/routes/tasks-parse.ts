// Copyright (c) 2026 VGX Global Consulting (OPC) Private Limited. All rights reserved.

import type { FastifyInstance } from 'fastify';
import Groq from 'groq-sdk';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { env } from '../lib/env.js';

const bodySchema = z.object({
  text: z.string().min(1).max(500),
});

interface ParsedTask {
  title: string;
  dueDate: string | null;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  description: string | null;
}

export default async function taskParseRoutes(app: FastifyInstance) {
  app.post(
    '/tasks/parse',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      if (!env.GROQ_API_KEY) {
        return reply.status(503).send({ error: 'AI parsing not configured' });
      }

      const body = bodySchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({ error: 'text is required (max 500 chars)' });
      }

      const today = new Date().toISOString().split('T')[0];

      const groq = new Groq({ apiKey: env.GROQ_API_KEY });

      const completion = await groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: `You are a task parser for a project management app. Extract structured data from the user's description.
Return ONLY valid JSON — no explanation, no markdown, just the JSON object.
Fields:
  "title": string (the task name, concise, required)
  "dueDate": "YYYY-MM-DD" or null (parse relative dates like "tomorrow", "next Friday", "in 3 days")
  "priority": "LOW" | "MEDIUM" | "HIGH" | null
  "description": string or null (any extra context beyond the title)
Today is ${today}.`,
          },
          { role: 'user', content: body.data.text },
        ],
        temperature: 0,
        max_tokens: 200,
        response_format: { type: 'json_object' },
      });

      try {
        const raw = JSON.parse(completion.choices[0]?.message?.content ?? '{}') as Partial<ParsedTask>;
        const result: ParsedTask = {
          title: typeof raw.title === 'string' ? raw.title.trim() : body.data.text,
          dueDate: typeof raw.dueDate === 'string' ? raw.dueDate : null,
          priority: ['LOW', 'MEDIUM', 'HIGH'].includes(raw.priority ?? '') ? raw.priority! : null,
          description: typeof raw.description === 'string' ? raw.description : null,
        };
        return reply.send({ data: result });
      } catch {
        return reply.status(500).send({ error: 'Failed to parse task' });
      }
    },
  );
}
