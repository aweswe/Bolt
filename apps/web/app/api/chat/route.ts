import { streamReasoningLoop } from '@bolt/ai/orchestrator';
import { insertChatMessage } from '@bolt/backend/chat';
import { NextRequest } from 'next/server';

async function safeInsert(projectId: string, role: 'user' | 'assistant' | 'system', content: string) {
  try {
    await insertChatMessage(projectId, role, content);
  } catch {
    // Fallback for local development without Supabase bootstrap data.
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { projectId?: string; prompt?: string };

  if (!body.projectId || !body.prompt) {
    return Response.json({ error: 'projectId and prompt are required' }, { status: 400 });
  }

  await safeInsert(body.projectId, 'user', body.prompt);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        let patch = '';
        for await (const event of streamReasoningLoop({ projectId: body.projectId!, prompt: body.prompt! })) {
          if (event.type === 'patch') patch = event.patch;
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        }
        await safeInsert(body.projectId!, 'assistant', patch);
        controller.close();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unexpected chat failure';
        controller.enqueue(encoder.encode(`${JSON.stringify({ type: 'error', message })}\n`));
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'content-type': 'application/x-ndjson; charset=utf-8',
      'cache-control': 'no-cache, no-transform'
    }
  });
}
