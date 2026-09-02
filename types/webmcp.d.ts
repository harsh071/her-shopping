/**
 * Minimal ambient typing for the imperative WebMCP surface exposed by
 * ChatGPT's in-app browser and Chrome's WebMCP testing flag.
 */
type ModelContextTool = {
  name: string;
  title?: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (input: unknown) => unknown;
  annotations?: {
    readOnlyHint?: boolean;
    untrustedContentHint?: boolean;
  };
};

interface Document {
  readonly modelContext?: {
    registerTool: (
      tool: ModelContextTool,
      options?: { signal?: AbortSignal },
    ) => void | Promise<void>;
    unregisterTool?: (name: string) => void | Promise<void>;
  };
}
