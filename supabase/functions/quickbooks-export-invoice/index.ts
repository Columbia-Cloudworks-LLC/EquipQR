import { createRedactedLogStep } from "../_shared/redacted-logger.ts";
import { serveQuickBooksFunction } from "../_shared/quickbooks-serve.ts";
import { handleQuickBooksExportInvoice } from "./qbo-export-handler.ts";

export { __testables } from "./qbo-invoice-lines.ts";
export { __payloadTestables } from "./qbo-invoice-payload.ts";

const FUNCTION_NAME = "quickbooks-export-invoice";
const logStep = createRedactedLogStep("QUICKBOOKS-EXPORT-INVOICE");

serveQuickBooksFunction(FUNCTION_NAME, logStep, (context) =>
  handleQuickBooksExportInvoice(context, logStep)
);
