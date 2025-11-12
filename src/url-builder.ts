import { DraftsAction } from './types.js';

/**
 * Builds a Drafts x-callback-url with the specified action and parameters
 */
export function buildDraftsUrl(
  action: DraftsAction,
  params: Record<string, string | number | boolean | undefined>
): string {
  const baseUrl = `drafts://x-callback-url/${action}`;
  const queryParams = new URLSearchParams();

  // Filter out undefined values and convert to strings
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      queryParams.append(key, String(value));
    }
  });

  const queryString = queryParams.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

/**
 * Encodes callback URLs for use in x-callback-url parameters
 */
export function encodeCallbackUrl(url: string): string {
  return encodeURIComponent(url);
}

/**
 * Special marker for clipboard content in text parameters
 */
export const CLIPBOARD_MARKER = '||clipboard||';
