import type { QueryClient } from '@tanstack/react-query';

const registeredClients = new Set<QueryClient>();

export function registerTestQueryClient(client: QueryClient): void {
  registeredClients.add(client);
}

export function clearRegisteredTestQueryClients(): void {
  for (const client of registeredClients) {
    client.clear();
    client.getQueryCache().clear();
    client.getMutationCache().clear();
  }
  registeredClients.clear();
}
