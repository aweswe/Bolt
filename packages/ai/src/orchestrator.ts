export type ReasoningPhase = 'plan' | 'generate' | 'execute' | 'fix' | 'refine';

export type ReasoningStep = {
  phase: ReasoningPhase;
  summary: string;
  output?: string;
};

export type GeneratedFile = {
  path: string;
  content: string;
  language: string;
};

export type LoopInput = {
  projectId: string;
  prompt: string;
};

export type LoopResult = {
  steps: ReasoningStep[];
  finalPatch: string;
  files: GeneratedFile[];
};

export type StreamEvent =
  | { type: 'step'; step: ReasoningStep }
  | { type: 'files'; files: GeneratedFile[] }
  | { type: 'patch'; patch: string }
  | { type: 'done'; steps: ReasoningStep[]; finalPatch: string; files: GeneratedFile[] };

const DEFAULT_MODEL = 'anthropic/claude-3-5-sonnet';

type GatewayResponse = {
  summary: string;
  patch: string;
  files: GeneratedFile[];
};

function fallbackResponse(prompt: string): GatewayResponse {
  return {
    summary: 'Generated starter Next.js app from fallback template',
    patch: `diff --git a/app/page.tsx b/app/page.tsx\n+// Offline fallback patch for: ${prompt}`,
    files: [
      {
        path: 'app/page.tsx',
        language: 'typescript',
        content:
          "export default function Page(){return <main style={{padding:24,fontFamily:'Inter'}}>MVP generated in offline mode.</main>}"
      }
    ]
  };
}

async function generateWithGateway(prompt: string): Promise<GatewayResponse> {
  const token = process.env.AI_GATEWAY_API_KEY;

  if (!token) {
    return fallbackResponse(prompt);
  }

  const response = await fetch('https://gateway.ai.vercel.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      model: process.env.AI_GATEWAY_MODEL ?? DEFAULT_MODEL,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            'Return JSON only: {"summary":string,"patch":string,"files":[{"path":string,"language":string,"content":string}]}. Build minimal runnable Next.js files.'
        },
        { role: 'user', content: prompt }
      ]
    })
  });

  if (!response.ok) {
    return fallbackResponse(prompt);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content?.trim();
  if (!content) return fallbackResponse(prompt);

  try {
    const parsed = JSON.parse(content) as GatewayResponse;
    if (!parsed.patch || !Array.isArray(parsed.files) || !parsed.files.length) {
      return fallbackResponse(prompt);
    }
    return parsed;
  } catch {
    return fallbackResponse(prompt);
  }
}

export async function runReasoningLoop(input: LoopInput): Promise<LoopResult> {
  const generation = await generateWithGateway(input.prompt);

  const steps: ReasoningStep[] = [
    { phase: 'plan', summary: `Structured project goals for ${input.projectId}` },
    { phase: 'generate', summary: generation.summary || 'Generated code artifacts' },
    { phase: 'execute', summary: 'Execution step is delegated to runtime API' },
    { phase: 'fix', summary: 'Fix step is triggered only when execution fails' },
    { phase: 'refine', summary: 'Refine step finalizes generated artifacts' }
  ];

  return {
    steps,
    finalPatch: generation.patch,
    files: generation.files
  };
}

export async function* streamReasoningLoop(input: LoopInput): AsyncGenerator<StreamEvent> {
  const result = await runReasoningLoop(input);

  for (const step of result.steps) {
    yield { type: 'step', step };
    if (step.phase === 'generate') {
      yield { type: 'files', files: result.files };
    }
  }

  yield { type: 'patch', patch: result.finalPatch };
  yield { type: 'done', steps: result.steps, finalPatch: result.finalPatch, files: result.files };
}
