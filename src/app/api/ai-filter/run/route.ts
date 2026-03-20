/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/ai-filter/run/route.ts

import { generateObject } from 'ai';
import { gateway } from '@ai-sdk/gateway';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';

import { isAuthenticatedUser } from '../../middlewares/auth';
import AiQueryHistory from '@/app/models/AiQueryHistory';
import Contact from '@/app/models/Contact';

import dbConnect from '@/app/lib/db/connection';
import { hashQueryText } from '@/app/lib/utils/aiQueryHistory';
import { SYSTEM_PROMPT } from '@/app/lib/ai/systemPrompt';

import { executeFindQuery } from '@/helpers/executeFindQuery';
import { executeAggregateQuery } from '@/helpers/executeAggregateQuery';

const ScalarSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

const ActionSchema = z.object({
  method: z.string(),
  args: z.array(z.union([ScalarSchema, z.record(ScalarSchema)])),
});

const StepQuerySchema = z.object({
  type: z.enum(['find', 'aggregate']),
  filterActions: z.array(ActionSchema),
  projection: z.record(z.number()).nullable(),
  sort: z.record(z.number()).nullable(),
  limit: z.number(),
  populate: z.array(z.string()),
  aggregateActions: z.array(ActionSchema),
  ui: z.object({
    type: z.enum(['table', 'stat_card', 'stat_table', 'chart_trend']),
    title: z.string().nullable(),
  }),
  reasoning: z.string().nullable(),
});

const RawMongoQuerySchema = z.object({
  steps: z.array(StepQuerySchema).min(1),
});

async function authenticate(request: NextRequest) {
  const currentUser = await isAuthenticatedUser(request);
  const rawUserId = currentUser?._id;

  if (!rawUserId) throw new Error('Missing user id');
  if (!mongoose.isValidObjectId(rawUserId)) throw new Error('Invalid user id');

  const realUserId = new mongoose.Types.ObjectId(String(rawUserId));
  return { currentUser, realUserId };
}

function normalizeStep(step: any) {
  return {
    type: step.type,
    filterActions: Array.isArray(step.filterActions) ? step.filterActions : [],
    projection: step.projection ?? null,
    sort: step.sort ?? null,
    limit: typeof step.limit === 'number' ? step.limit : 20,
    populate: Array.isArray(step.populate) ? step.populate : [],
    aggregateActions: Array.isArray(step.aggregateActions) ? step.aggregateActions : [],
    ui: {
      type: step.ui?.type ?? 'table',
      title: step.ui?.title ?? null,
    },
    reasoning: step.reasoning ?? null,
  };
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const { currentUser, realUserId } = await authenticate(request);

    const body = await request.json();
    const userQueryInternal = body.query?.trim();
    const userQueryDisplay = body.queryDisplay?.trim() || userQueryInternal;

    if (!userQueryInternal) {
      return NextResponse.json({ error: 'Missing query' }, { status: 400 });
    }

    const queryHash = hashQueryText(userQueryInternal);

    const cachedDoc = await AiQueryHistory.findOne({ user: currentUser._id, queryHash })
      .sort({ updatedAt: -1 });

    let querySpec: any;
    let usage: any = null;
    let isCached = false;

    if (cachedDoc?.querySpec) {
      querySpec = cachedDoc.querySpec;
      isCached = true;
      await AiQueryHistory.updateOne({ _id: cachedDoc._id }, { $set: { lastUsedAt: new Date() } });
    } else {
      const model = gateway('openai/gpt-4.1');

      const result = await generateObject({
        model,
        system: SYSTEM_PROMPT,
        prompt: userQueryInternal,
        schema: RawMongoQuerySchema,
        temperature: 0.15,
      });

      if (!result.object) throw new Error('No structured output received');

      querySpec = {
        steps: result.object.steps.map(normalizeStep),
      };
      usage = result.usage;

      await AiQueryHistory.updateOne(
        { user: currentUser._id, queryHash },
        {
          $set: {
            queryText: userQueryDisplay || userQueryInternal,
            queryTextDisplay: userQueryDisplay,
            queryTextInternal: userQueryInternal,
            querySpec,
            lastUsedAt: new Date(),
          },
        },
        { upsert: true }
      );
    }

    const results: any[] = [];

    for (const rawStep of querySpec.steps) {
      const step = normalizeStep(rawStep);

      if (step.type === 'find') {
        const data = await executeFindQuery(Contact, step, realUserId);
        results.push({ step, data });
      } else if (step.type === 'aggregate') {
        const data = await executeAggregateQuery(step);
        results.push({ step, data });
      } else {
        throw new Error(`Unknown step type: ${step.type}`);
      }
    }

    return NextResponse.json({
      success: true,
      querySpec,
      results,
      usage,
      rawPrompt: userQueryDisplay,
      rawPromptInternal: userQueryInternal,
      cached: isCached,
    });
  } catch (err: any) {
    console.error('[AI Run Error]', err);

    if (err.message?.includes('login') || err.message?.includes('not found')) {
      return NextResponse.json({ error: 'Authentication required', message: err.message }, { status: 401 });
    }

    return NextResponse.json({ error: 'Run execution failed', message: err.message || 'Internal error' }, { status: 400 });
  }
}

export const runtime = 'nodejs';
export const maxDuration = 45;



