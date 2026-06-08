export type InvokeErrorPayload = { error?: string; code?: string };

export async function getInvokeErrorPayload(
  error: Error & { context?: unknown },
): Promise<InvokeErrorPayload | null> {
  const response = error.context instanceof Response ? error.context : null;
  if (!response) {
    return null;
  }

  return (await response
    .clone()
    .json()
    .catch(() => null)) as InvokeErrorPayload | null;
}

export async function throwGoogleWorkspaceInvokeError(
  error: Error & { context?: unknown },
): Promise<never> {
  const errorPayload = await getInvokeErrorPayload(error);
  if (errorPayload?.error) {
    const typedError = new Error(errorPayload.error) as Error & { code?: string };
    typedError.code = errorPayload.code;
    throw typedError;
  }
  throw new Error(error.message);
}

export function throwGoogleWorkspaceResponseError(data: {
  error?: string;
  code?: string;
}): never {
  const typedError = new Error(data.error ?? 'Request failed') as Error & { code?: string };
  typedError.code = data.code;
  throw typedError;
}
