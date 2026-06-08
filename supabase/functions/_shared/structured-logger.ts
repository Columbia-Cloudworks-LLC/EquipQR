/**
 * Structured JSON logger for edge functions that include correlation IDs.
 */
export function createStructuredLogger(functionName: string) {
  return (
    step: string,
    correlationId: string,
    details?: Record<string, unknown>,
  ) => {
    console.log(
      JSON.stringify({
        level: "info",
        function: functionName,
        correlation_id: correlationId,
        step,
        ...details,
      }),
    );
  };
}
