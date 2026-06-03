/**
 * Build a full URL from a file path and optional base URL
 * Uses a default base URL if none is provided
 */

export const BASE_FILE_URL = 'https://v2.m-eyewear.com';

export const buildFileUrl = (
  filePath: string | null | undefined,
  baseUrl: string = BASE_FILE_URL
): string | null => {
  if (!filePath) return null;

  // Remove trailing slash from baseUrl if exists
  const cleanBase = baseUrl.replace(/\/$/, '');
  // Remove leading slash from filePath if exists
  const cleanPath = filePath.replace(/^\//, '');

  return `${cleanBase}/${cleanPath}`;
};