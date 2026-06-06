export function buildCollapsedPmChecklistSections(
  sections: string[],
): Record<string, boolean> {
  const initialOpenSections: Record<string, boolean> = {};
  sections.forEach((section) => {
    initialOpenSections[section] = false;
  });
  return initialOpenSections;
}
