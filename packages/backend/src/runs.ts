import { createSupabaseServerClient } from './client';

export type RunStatus = 'queued' | 'running' | 'success' | 'failed';

export async function createExecutionRun(projectId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('execution_runs')
    .insert({
      project_id: projectId,
      status: 'queued',
      started_at: new Date().toISOString()
    })
    .select('id, project_id, status, logs, diagnostics, started_at')
    .single();

  if (error) throw error;
  return data;
}

export async function updateExecutionRun(
  runId: string,
  status: RunStatus,
  logs: string[],
  diagnostics: Record<string, unknown> = {}
) {
  const supabase = createSupabaseServerClient();
  const updatePayload: Record<string, unknown> = {
    status,
    logs,
    diagnostics
  };

  if (status === 'success' || status === 'failed') {
    updatePayload.finished_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('execution_runs')
    .update(updatePayload)
    .eq('id', runId)
    .select('id, status, logs, diagnostics, started_at, finished_at')
    .single();

  if (error) throw error;
  return data;
}
