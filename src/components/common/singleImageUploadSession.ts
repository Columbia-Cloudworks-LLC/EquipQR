export type ImageUploadSession =
  | { kind: 'empty' }
  | { kind: 'current'; src: string }
  | { kind: 'pending'; file: File; src: string | null };

export function formatAcceptedTypesLabel(acceptedTypes: string[]): string {
  return acceptedTypes.map((type) => type.replace('image/', '').toUpperCase()).join(', ');
}

export function resolveImageUploadSession(
  currentImageUrl: string | undefined | null,
  imageLoadFailed: boolean,
  pendingFile: File | null,
  previewUrl: string | null,
): ImageUploadSession {
  if (pendingFile) {
    return { kind: 'pending', file: pendingFile, src: previewUrl };
  }
  if (currentImageUrl && !imageLoadFailed) {
    return { kind: 'current', src: currentImageUrl };
  }
  return { kind: 'empty' };
}

export function validateImageFile(
  file: File,
  acceptedTypes: string[],
  maxSizeMB: number,
): { ok: true } | { ok: false; description: string } {
  const formatLabel = formatAcceptedTypesLabel(acceptedTypes);
  if (!acceptedTypes.includes(file.type)) {
    return {
      ok: false,
      description: `Unsupported format: ${file.name}. Use ${formatLabel}.`,
    };
  }
  if (file.size > maxSizeMB * 1024 * 1024) {
    return {
      ok: false,
      description: `File too large: ${file.name}. Maximum size is ${maxSizeMB} MB.`,
    };
  }
  return { ok: true };
}

export function sessionImageSrc(session: ImageUploadSession): string | null {
  if (session.kind === 'empty') return null;
  return session.src;
}
