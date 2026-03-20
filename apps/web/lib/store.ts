'use client';

import { create } from 'zustand';

type Pane = 'chat' | 'editor' | 'preview';

type UiState = {
  projectId: string;
  activeFile: string;
  prompt: string;
  panes: Pane[];
  setPrompt: (value: string) => void;
  setActiveFile: (path: string) => void;
};

export const useWorkbenchStore = create<UiState>((set) => ({
  projectId: '00000000-0000-0000-0000-000000000001',
  activeFile: 'app/page.tsx',
  prompt: '',
  panes: ['chat', 'editor', 'preview'],
  setPrompt: (prompt) => set({ prompt }),
  setActiveFile: (activeFile) => set({ activeFile })
}));
