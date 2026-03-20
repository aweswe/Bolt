import { createSupabaseServerClient } from './client';

export type ProjectFileRecord = {
  project_id: string;
  path: string;
  content: string;
  language: string;
};

export async function upsertProjectFiles(files: ProjectFileRecord[]) {
  if (!files.length) return [];

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('project_files')
    .upsert(files, { onConflict: 'project_id,path' })
    .select('id, project_id, path, language, version, updated_at');

  if (error) throw error;
  return data;
}

export async function listProjectFiles(projectId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('project_files')
    .select('path, content, language, version, updated_at')
    .eq('project_id', projectId)
    .order('path', { ascending: true });

  if (error) throw error;
  return data;
}
