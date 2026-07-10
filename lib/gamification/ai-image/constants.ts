export const AI_IMAGE_GENERATION_COIN_COST = 10;
export const AI_IMAGE_THEME_DRAW_COIN_COST = 200;
export const AI_IMAGE_MAX_REFERENCE_IMAGES = 3;
export const AI_IMAGE_ALLOWED_REQUEST_COUNTS = [1, 2, 4] as const;
export const AI_IMAGE_RETRY_MIN_COUNT = 1;
export const AI_IMAGE_RETRY_MAX_COUNT = 4;
export const AI_IMAGE_TASK_TIMEOUT_MS = 10 * 60 * 1000;
export const AI_IMAGE_PROVIDER_MODEL = "gpt-image-2";
export const AI_IMAGE_PROVIDER_BASE_URL = "https://api.boluopets.com/v1";
export const AI_IMAGE_GENERATION_URL =
  process.env.IMAGE_GENERATION_URL ?? `${AI_IMAGE_PROVIDER_BASE_URL}/images/generations`;
export const AI_IMAGE_EDIT_URL =
  process.env.IMAGE_EDIT_URL ?? `${AI_IMAGE_PROVIDER_BASE_URL}/images/edits`;
export const AI_IMAGE_INPUT_COS_PREFIX = "share-project/ai-image-inputs";
export const AI_IMAGE_OUTPUT_COS_PREFIX = "share-project/ai-images";
