import { streamReasoningLoop } from '@bolt/ai/orchestrator';
import { insertChatMessage } from '@bolt/backend/chat';
import { upsertProjectFiles } from '@bolt/backend/files';
import { createExecutionRun, updateExecutionRun } from '@bolt/backend/runs';
import { IframeSandboxAdapter } from '@bolt/execution/runtime';
import { NextRequest } from 'next/server';

const runtime = new IframeSandboxAdapter();

async function safeInsert(projectId: string, role: 'user' | 'assistant' | 'system', content: string) {
  try {
    await insertChatMessage(projectId, role, content);
  } catch {
    // local fallback
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
      let patch = '';
      let generatedFiles: Array<{ path: string; content: string; language: string }> = [];

      try {
        for await (const event of streamReasoningLoop({ projectId: body.projectId!, prompt: body.prompt! })) {
          if (event.type === 'patch') {
            patch = event.patch;
          }

          if (event.type === 'files') {
            generatedFiles = event.files;
            try {
              await upsertProjectFiles(
                event.files.map((file) => ({
                  project_id: body.projectId!,
                  path: file.path,
                  content: file.content,
                  language: file.language
                }))
              );
            } catch {
              // local fallback
            }
          }

          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        }

        const run = await createExecutionRun(body.projectId!).catch(() => ({ id: 'local-run' }));
        if (run.id !== 'local-run') {
          await updateExecutionRun(run.id, 'running', ['Execution started']);
        }

        const fileMap = Object.fromEntries(generatedFiles.map((file) => [file.path, file.content]));
        const entry = fileMap['app/page.tsx'] ? 'app/page.tsx' : generatedFiles[0]?.path ?? 'app/page.tsx';
        if (!fileMap[entry]) {
          fileMap[entry] = `export default function Page(){return <div>MVP generated app</div>;}`;
        }

        const execution = await runtime.run({ files: fileMap, entry });
        const runStatus = execution.ok ? 'success' : 'failed';

        if (run.id !== 'local-run') {
          await updateExecutionRun(run.id, runStatus, execution.logs, {
            diagnostics: execution.diagnostics ?? null,
            previewUrl: execution.previewUrl ?? null
          });
        }

        controller.enqueue(
          encoder.encode(
            `${JSON.stringify({ type: 'execution', status: runStatus, logs: execution.logs, diagnostics: execution.diagnostics ?? null })}\n`
          )
        );

        await safeInsert(body.projectId!, 'assistant', patch || 'Generation completed');
        controller.close();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Orchestration failed';
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
