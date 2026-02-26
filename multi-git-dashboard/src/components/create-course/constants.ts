export enum InstallationStatus {
  IDLE = 'idle',
  LOADING = 'loading',
  SUCCESS = 'success',
  ERROR = 'error',
}

export const modelOptions: Record<string, string[]> = {
  Gemini: [
    'gemini-1.5-pro',
    'gemini-1.5-flash',
    'gemini-2.0-flash-lite',
    'gemini-2.0-flash',
  ],
  OpenAI: [
    'gpt-3.5-turbo',
    'gpt-4o-mini',
    'gpt-4o',
    'gpt-4.5-preview',
    'o1-mini',
    'o1',
  ],
  DeepSeek: ['deepseek-chat', 'deepseek-reasoner'],
};
