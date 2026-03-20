import { listProjectFiles } from '@bolt/backend/files';
import { createExecutionRun, updateExecutionRun } from '@bolt/backend/runs';
import { IframeSandboxAdapter } from '@bolt/execution/runtime';
import { NextRequest } from 'next/server';

const runtime = new IframeSandboxAdapter();

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { projectId?: string; entry?: string };

  if (!body.projectId || !body.entry) {
    return Response.json({ error: 'projectId and entry are required' }, { status: 400 });
  }

  let runId = 'local-run';
  try {
    const run = await createExecutionRun(body.projectId);
    runId = run.id;
    await updateExecutionRun(run.id, 'running', ['Execution started']);
  } catch {
    // local dev without Supabase: execute in-memory only
  }

  try {
    const files = await listProjectFiles(body.projectId).catch(() => []);
    const fileMap = Object.fromEntries(files.map((file) => [file.path, file.content]));
    if (!fileMap[body.entry]) {
      fileMap[body.entry] = `export default function Page(){return <div>Generated preview</div>;}`;
    }

    const result = await runtime.run({ files: fileMap, entry: body.entry });
    const status = result.ok ? 'success' : 'failed';

    const run = runId === 'local-run'
      ? { id: runId, status, logs: result.logs, diagnostics: result.diagnostics ?? null }
      : await updateExecutionRun(runId, status, result.logs, {
          diagnostics: result.diagnostics ?? null,
          previewUrl: result.previewUrl ?? null
        });

    return Response.json({ run, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Execution failed';

    const run =
      runId === 'local-run'
        ? { id: runId, status: 'failed', logs: ['Execution crashed'], diagnostics: { error: message } }
        : await updateExecutionRun(runId, 'failed', ['Execution crashed'], { error: message });

    return Response.json({ run, error: message }, { status: 500 });
  }
}
