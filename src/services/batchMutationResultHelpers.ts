export type BatchRowMutationResult = { id: string; error: string | null };

export function batchUpdateRowResult(
  id: string,
  error: { message: string } | null,
  rows: { id: string }[] | null | undefined,
  notFoundMessage: string,
): BatchRowMutationResult {
  if (error) {
    return { id, error: error.message };
  }
  if (!rows?.length) {
    return { id, error: notFoundMessage };
  }
  return { id, error: null };
}

export function collectBatchMutationResults(
  results: PromiseSettledResult<BatchRowMutationResult>[],
  chunk: { id: string }[],
): { succeeded: string[]; failed: Array<{ id: string; error: string }> } {
  const succeeded: string[] = [];
  const failed: Array<{ id: string; error: string }> = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === 'fulfilled') {
      const { id, error } = result.value;
      if (error) {
        failed.push({ id, error });
      } else {
        succeeded.push(id);
      }
    } else {
      const id = chunk[i].id;
      const error =
        result.reason instanceof Error ? result.reason.message : 'Unknown error';
      failed.push({ id, error });
    }
  }

  return { succeeded, failed };
}
