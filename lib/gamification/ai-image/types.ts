export type AiImageTaskStatus = "queued" | "running" | "completed" | "partial" | "failed";
export type AiImageItemStatus = "queued" | "running" | "completed" | "failed";
export type AiImageThemeUnlockSource = "default" | "draw";

export type AiImageTemplateKind =
  | "reference_edit"
  | "reference_transform"
  | "creative_poster"
  | "scene_generation"
  | "asset_generation";

export type AiImageReferencePolicy = "required" | "recommended" | "optional" | "not_recommended";

export interface AiImagePromptSections {
  taskGoal: string;
  inputFit: string;
  referenceRules: string;
  styleRules: string;
  compositionRules: string;
  userPromptRules: string;
  conflictRules: string;
  qualityRules: string;
  negativeRules: string;
}

export interface AiImageThemePublicDefinition {
  id: string;
  name: string;
  description: string;
  previewImageUrl: string;
  defaultUnlocked: boolean;
  enabled: boolean;
  sortOrder: number;
  tag: string;
  palette: string[];
}

export interface AiImageThemeDefinition extends AiImageThemePublicDefinition {
  templateKind: AiImageTemplateKind;
  referencePolicy: AiImageReferencePolicy;
  bestFor: string[];
  avoidFor: string[];
  promptSections?: AiImagePromptSections;
  promptTemplate: string;
}

export interface AiImagePromptSnapshot {
  themeId: string;
  themeName: string;
  providerPrompt: string;
  clientPromptSummary: string;
}
