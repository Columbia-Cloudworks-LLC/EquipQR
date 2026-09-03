export function resolveDocumentTitle(title: string, path?: string): string {
  if (path === '/' || /\bEquipQR\b/.test(title)) {
    return title;
  }

  return `${title} | EquipQR`;
}
