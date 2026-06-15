export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024;
export const MAX_FILENAME_LENGTH = 255;

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const;

export const logStep = (step: string, details?: Record<string, unknown>) => {
  const safeDetails = details ? { ...details } : undefined;
  if (safeDetails) {
    delete safeDetails.access_token;
    delete safeDetails.contentBase64;
  }
  const detailsStr = safeDetails ? ` - ${JSON.stringify(safeDetails)}` : "";
  console.log(`[UPLOAD-TO-GOOGLE-DRIVE] ${step}${detailsStr}`);
};

export interface UploadRequest {
  organizationId: string;
  filename: string;
  contentBase64: string;
  mimeType?: string;
  parentId?: string;
  workOrderId?: string;
}

export interface DriveFileResponse {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  webContentLink?: string;
}

export function sanitizeFilename(filename: string): string {
  let sanitized = filename.replace(/[^a-zA-Z0-9.\-_ ]/g, "_");
  sanitized = sanitized.replace(/\.{2,}/g, "_");
  sanitized = sanitized.trim();
  sanitized = sanitized.replace(/[_ ]{2,}/g, "_");

  if (sanitized.length > MAX_FILENAME_LENGTH) {
    const lastDot = sanitized.lastIndexOf(".");
    if (lastDot > 0) {
      const ext = sanitized.substring(lastDot);
      const name = sanitized.substring(0, MAX_FILENAME_LENGTH - ext.length - 1);
      sanitized = name + ext;
    } else {
      sanitized = sanitized.substring(0, MAX_FILENAME_LENGTH);
    }
  }

  if (!sanitized || sanitized === "." || sanitized === "_") {
    sanitized = "uploaded-file";
  }

  return sanitized;
}

export function estimateDecodedSize(contentBase64: string): number {
  return Math.ceil(contentBase64.length * 3 / 4);
}
