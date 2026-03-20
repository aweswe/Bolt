import { createSupabaseServerClient } from './client';

export async function createProject(ownerId: string, name: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('projects')
    .insert({ owner_id: ownerId, name })
    .select('id, owner_id, name, created_at')
    .single();

  if (error) throw error;
  return data;
}
