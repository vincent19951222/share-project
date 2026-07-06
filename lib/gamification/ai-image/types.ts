export type AiImageTaskStatus = "queued" | "running" | "completed" | "partial" | "failed";
export type AiImageItemStatus = "queued" | "running" | "completed" | "failed";
export type AiImageThemeUnlockSource = "default" | "draw";

export interface AiImageThemeDefinition {
  id: string;
  name: string;
  description: string;
  previewImageUrl: string;
  promptTemplate: string;
  defaultUnlocked: boolean;
  enabled: boolean;
  sortOrder: number;
  tag: string;
  palette: string[];
}

export interface AiImagePromptSnapshot {
  themeId: string;
  themeName: string;
  providerPrompt: string;
  clientPromptSummary: string;
}
