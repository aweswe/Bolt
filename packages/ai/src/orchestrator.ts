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

const DEFAULT_GATEWAY_MODEL = 'anthropic/claude-3-5-sonnet';
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
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

function generationPrompt(prompt: string) {
  return [
    'Return JSON only with this exact shape:',
    '{"summary":string,"patch":string,"files":[{"path":string,"language":string,"content":string}]}.',
    'Build minimal runnable Next.js files and include app/page.tsx in files array.',
    `User prompt: ${prompt}`
  ].join('\n');
}

function parseGenerationPayload(raw: string, fallbackPrompt: string): GatewayResponse {
  try {
    const parsed = JSON.parse(raw) as GatewayResponse;
    if (!parsed.patch || !Array.isArray(parsed.files) || !parsed.files.length) {
      return fallbackResponse(fallbackPrompt);
    }
    return parsed;
  } catch {
    return fallbackResponse(fallbackPrompt);
  }
}

async function generateWithGemini(prompt: string): Promise<GatewayResponse | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  const model = process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: generationPrompt(prompt) }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json'
      }
    })
  });

  if (!response.ok) return null;

  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return null;

  return parseGenerationPayload(text, prompt);
}

async function generateWithGateway(prompt: string): Promise<GatewayResponse | null> {
  const token = process.env.AI_GATEWAY_API_KEY;

  if (!token) {
    return null;
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
      model: process.env.AI_GATEWAY_MODEL ?? DEFAULT_GATEWAY_MODEL,
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
    return null;
    return fallbackResponse(prompt);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content?.trim();
  if (!content) return null;

  return parseGenerationPayload(content, prompt);
}

async function generateApp(prompt: string): Promise<GatewayResponse> {
  const gemini = await generateWithGemini(prompt);
  if (gemini) return gemini;

  const gateway = await generateWithGateway(prompt);
  if (gateway) return gateway;

  return fallbackResponse(prompt);
}

export async function runReasoningLoop(input: LoopInput): Promise<LoopResult> {
  const generation = await generateApp(input.prompt);
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
