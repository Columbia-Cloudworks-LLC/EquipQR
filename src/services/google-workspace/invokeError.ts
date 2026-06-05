type InvokeErrorPayload = { error?: string; code?: string };

export async function throwGoogleWorkspaceInvokeError(
  error: Error & { context?: unknown },
): Promise<never> {
  const response = error.context instanceof Response ? error.context : null;
  if (response) {
    const errorPayload = (await response
      .clone()
      .json()
      .catch(() => null)) as InvokeErrorPayload | null;
    if (errorPayload?.error) {
      const typedError = new Error(errorPayload.error) as Error & { code?: string };
      typedError.code = errorPayload.code;
      throw typedError;
    }
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
