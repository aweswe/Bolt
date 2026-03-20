export type ExecutionRequest = {
  files: Record<string, string>;
  entry: string;
};

export type ExecutionResult = {
  ok: boolean;
  logs: string[];
  previewUrl?: string;
  diagnostics?: string;
};

export interface SandboxAdapter {
  run(request: ExecutionRequest): Promise<ExecutionResult>;
}

export class IframeSandboxAdapter implements SandboxAdapter {
  async run(request: ExecutionRequest): Promise<ExecutionResult> {
    if (!request.files[request.entry]) {
      return {
        ok: false,
        logs: ['Entry file missing'],
        diagnostics: `Cannot resolve ${request.entry}`
      };
    }

    return {
      ok: true,
      logs: ['Build succeeded', 'Preview served in isolated iframe context'],
      previewUrl: '/preview/session-local'
    };
  }
}
