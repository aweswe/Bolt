'use client';

import { useMemo, useState } from 'react';
import { useWorkbenchStore } from '../lib/store';

type GeneratedFile = { path: string; content: string; language: string };

type ChatEvent =
  | { type: 'step'; step: { phase: string; summary: string } }
  | { type: 'files'; files: GeneratedFile[] }
  | { type: 'patch'; patch: string }
  | { type: 'execution'; status: string; logs: string[]; diagnostics?: string | null }
  | { type: 'done'; finalPatch: string }
  | { type: 'error'; message: string };

export function Workbench() {
  const { projectId, activeFile, prompt, setPrompt, setActiveFile } = useWorkbenchStore();
  const [stream, setStream] = useState<string[]>([]);
  const [patch, setPatch] = useState('');
  const [runStatus, setRunStatus] = useState('idle');
  const [runLogs, setRunLogs] = useState<string[]>([]);
  const [files, setFiles] = useState<GeneratedFile[]>([{ path: 'app/page.tsx', language: 'typescript', content: '' }]);
  const [pending, setPending] = useState(false);

  const canGenerate = useMemo(() => prompt.trim().length > 0 && !pending, [pending, prompt]);
  const activeContent = files.find((file) => file.path === activeFile)?.content;

  async function handleGenerate() {
    if (!canGenerate) return;
    setPending(true);
    setPatch('');
    setStream([]);
    setRunLogs([]);
    setRunStatus('running');

    const response = await fetch('/api/orchestrate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ projectId, prompt })
    });

    if (!response.body) {
      setStream((prev) => [...prev, 'error: no stream body returned']);
      setPending(false);
      setRunStatus('failed');
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      while (buffer.includes('\n')) {
        const newlineIndex = buffer.indexOf('\n');
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);
        if (!line) continue;

        const event = JSON.parse(line) as ChatEvent;

        if (event.type === 'step') {
          setStream((prev) => [...prev, `${event.step.phase}: ${event.step.summary}`]);
        }

        if (event.type === 'files') {
          setFiles(event.files);
          if (event.files[0]) setActiveFile(event.files[0].path);
          setStream((prev) => [...prev, `files: ${event.files.length} generated`]);
        }

        if (event.type === 'patch') {
          setPatch(event.patch);
        }

        if (event.type === 'execution') {
          setRunStatus(event.status);
          setRunLogs(event.logs);
          if (event.diagnostics) {
            setRunLogs((prev) => [...prev, `diagnostics: ${event.diagnostics}`]);
          }
        }

        if (event.type === 'error') {
          setRunStatus('failed');
          setStream((prev) => [...prev, `error: ${event.message}`]);
        }
      }
    }

    setPending(false);
  }

  return (
    <main style={{ height: '100vh', display: 'grid', gridTemplateColumns: '320px 1fr 1fr', gap: 1, background: 'var(--border-subtle)' }}>
      <section style={{ background: 'var(--bg-surface-1)', padding: 24, display: 'grid', gap: 16 }}>
        <header>
          <h1 style={{ margin: 0, fontSize: 20, letterSpacing: -0.2 }}>Bolt OS MVP</h1>
          <p style={{ margin: '8px 0 0', color: 'var(--text-muted)', fontSize: 13 }}>Plan → Generate → Persist → Execute → Stream</p>
        </header>
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Build me a fullstack app with auth, dashboard, and API..."
          style={{ minHeight: 160, borderRadius: 12, border: '1px solid var(--border-subtle)', background: 'var(--bg-surface-2)', color: 'var(--text-primary)', padding: 12 }}
        />
        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          style={{
            borderRadius: 12,
            border: '1px solid var(--accent-soft)',
            background: 'linear-gradient(180deg,#95adff,#748ef0)',
            color: '#0b1225',
            fontWeight: 600,
            padding: '12px 16px',
            cursor: canGenerate ? 'pointer' : 'not-allowed',
            opacity: canGenerate ? 1 : 0.6
          }}
        >
          {pending ? 'Building MVP...' : 'Generate + Execute'}
        </button>
        <div style={{ display: 'grid', gap: 8 }}>
          {stream.map((line) => (
            <div key={line} style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {line}
            </div>
          ))}
        </div>
      </section>

      <section style={{ background: 'var(--bg-surface-1)', display: 'grid', gridTemplateRows: 'auto 1fr auto' }}>
        <div style={{ borderBottom: '1px solid var(--border-subtle)', padding: 16, fontSize: 13 }}>Project files</div>
        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr' }}>
          <aside style={{ borderRight: '1px solid var(--border-subtle)', padding: 12, display: 'grid', gap: 4 }}>
            {files.map((file) => (
              <button
                key={file.path}
                onClick={() => setActiveFile(file.path)}
                style={{
                  textAlign: 'left',
                  border: 0,
                  background: file.path === activeFile ? 'var(--bg-surface-2)' : 'transparent',
                  color: file.path === activeFile ? 'var(--text-primary)' : 'var(--text-muted)',
                  padding: '8px 10px',
                  borderRadius: 8,
                  cursor: 'pointer'
                }}
              >
                {file.path}
              </button>
            ))}
          </aside>
          <article style={{ padding: 16 }}>
            <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 12, height: '100%', padding: 16, background: '#0f1420', overflow: 'auto' }}>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)' }}>Code editor mount target</p>
              <pre style={{ color: '#d7def1', marginTop: 12, whiteSpace: 'pre-wrap' }}>
                {activeContent || patch || '// generated code will render here'}
              </pre>
            </div>
          </article>
        </div>
        <div style={{ borderTop: '1px solid var(--border-subtle)', padding: 12, fontSize: 12, color: 'var(--text-muted)' }}>
          Runtime status: {runStatus}
        </div>
      </section>

      <section style={{ background: 'var(--bg-surface-1)', display: 'grid', gridTemplateRows: 'auto 1fr' }}>
        <div style={{ borderBottom: '1px solid var(--border-subtle)', padding: 16, fontSize: 13 }}>Preview + execution logs</div>
        <div style={{ padding: 16, display: 'grid', gap: 12, alignContent: 'start' }}>
          <div style={{ borderRadius: 16, border: '1px solid var(--border-subtle)', height: 220, background: 'radial-gradient(circle at top, #20273a, #0e111a)' }} />
          <div style={{ borderRadius: 12, border: '1px solid var(--border-subtle)', padding: 12, background: '#101623' }}>
            {runLogs.length ? (
              runLogs.map((log) => (
                <div key={log} style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {log}
                </div>
              ))
            ) : (
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Execution logs will appear here.</div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
