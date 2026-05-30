export const AVATAR_OPTIONS = [
  { key: "male1", label: "男生 1", url: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_avatars_male1.png" },
  { key: "male2", label: "男生 2", url: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_avatars_male2.png" },
  { key: "male3", label: "男生 3", url: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_avatars_male3.png" },
  { key: "male4", label: "男生 4", url: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_avatars_male4.png" },
  { key: "female1", label: "女生 1", url: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_avatars_female1.png" },
  { key: "female2", label: "女生 2", url: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_avatars_female2.png" },
  { key: "female3", label: "女生 3", url: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_avatars_female3.png" },
  { key: "female4", label: "女生 4", url: "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_avatars_female4.png" },
] as const;

export type AvatarKey = (typeof AVATAR_OPTIONS)[number]["key"];

export function getAvatarUrl(key: string): string {
  return AVATAR_OPTIONS.find((a) => a.key === key)?.url ?? "https://vincent-1355816760.cos.ap-guangzhou.myqcloud.com/obsidian_images/share_project_public_avatars_male1.png";
}

export function isValidAvatarKey(key: string): key is AvatarKey {
  return AVATAR_OPTIONS.some((a) => a.key === key);
}
