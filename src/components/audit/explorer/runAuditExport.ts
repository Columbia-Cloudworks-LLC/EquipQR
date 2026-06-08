export type AuditExportProgress = { current: number; total: number };

export type AuditExportRunner = (
  onProgress: (progress: AuditExportProgress) => void,
) => Promise<void>;

export async function runAuditExport(
  exportFn: AuditExportRunner,
  setExportProgressLabel: (label: string | undefined) => void,
  setIsExporting: (exporting: boolean) => void,
): Promise<void> {
  setIsExporting(true);
  setExportProgressLabel('Preparing export...');
  try {
    await exportFn(({ current, total }) => {
      setExportProgressLabel(
        total === 0
          ? 'No matching records found.'
          : `Exporting ${current.toLocaleString()} of ${total.toLocaleString()} records...`,
      );
    });
  } finally {
    setIsExporting(false);
    setExportProgressLabel(undefined);
  }
}
