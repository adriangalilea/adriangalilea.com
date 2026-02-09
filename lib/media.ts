// Single source of truth for media file type classification

export const VIDEO_EXTENSIONS = [".mp4", ".webm", ".mov"];
export const IMAGE_EXTENSIONS = [".png", ".webp", ".jpg", ".jpeg", ".gif"];
export const ANIMATED_EXTENSIONS = [".gif", ...VIDEO_EXTENSIONS];
export const NON_WEBM_ANIMATED = [".gif", ".mp4", ".mov"];
export const POSTER_EXTENSIONS = [".webp", ".jpg", ".jpeg", ".png"];
export const AVATAR_EXTENSIONS = [".png", ".webp", ".jpg", ".jpeg"];
export const COVER_EXTENSIONS = [
  ".png",
  ".webp",
  ".jpg",
  ".jpeg",
  ".gif",
  ...VIDEO_EXTENSIONS,
];
export const MEDIA_EXTENSIONS = [...COVER_EXTENSIONS];

export function isVideo(url: string): boolean {
  const lower = url.toLowerCase();
  return VIDEO_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function isGif(url: string): boolean {
  return url.toLowerCase().endsWith(".gif");
}

export function isAnimatedCover(url: string): boolean {
  const lower = url.toLowerCase();
  return ANIMATED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function isStaticCover(url: string): boolean {
  return !isAnimatedCover(url);
}

export function isMedia(name: string): boolean {
  const lower = name.toLowerCase();
  return MEDIA_EXTENSIONS.some((ext) => lower.endsWith(ext));
}
