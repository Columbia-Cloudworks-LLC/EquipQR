import { MAX_FILE_SIZE_BYTES } from "./gdrive-validation.ts";

export function decodeBase64Content(contentBase64: string): Uint8Array {
  const binaryString = atob(contentBase64);
  return Uint8Array.from(binaryString, (c) => c.charCodeAt(0));
}

export function isDecodedSizeAllowed(contentBase64: string): boolean {
  const estimatedDecodedSize = Math.ceil(contentBase64.length * 3 / 4);
  return estimatedDecodedSize < MAX_FILE_SIZE_BYTES;
}

export const __gdriveDecodeTestables = {
  decodeBase64Content,
  isDecodedSizeAllowed,
};
