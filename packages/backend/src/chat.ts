import { createSupabaseServerClient } from './client';

export type ChatRole = 'user' | 'assistant' | 'system';

export async function insertChatMessage(projectId: string, role: ChatRole, content: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({ project_id: projectId, role, content })
    .select('id, project_id, role, content, created_at')
    .single();

  if (error) throw error;
  return data;
}
