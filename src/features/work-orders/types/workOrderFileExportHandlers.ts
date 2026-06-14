/** Shared download + Google Drive export handler props for work order export menus. */
export interface WorkOrderFileExportHandlers {
  onDownloadXlsx: () => void;
  isExportingXlsx: boolean;
  onDownloadCsv: () => void;
  isExportingCsv: boolean;
  onDownloadDocx: () => void;
  isExportingDocx: boolean;
  docxDisabled?: boolean;
  onDriveDocs: () => void;
  isExportingToDocs: boolean;
  onDriveSheets: () => void;
  isExportingToSheets: boolean;
  isExportBusy: boolean;
}
