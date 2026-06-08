export function buildWorkOrderReportPdfFilename(title: string): string {
  const safeTitle = title
    .replace(/[^a-z0-9]/gi, '-')
    .replace(/-+/g, '-')
    .slice(0, 50);
  const dateStr = new Date().toISOString().split('T')[0];
  return `WorkOrder-${safeTitle}-${dateStr}.pdf`;
}
