import { createContext } from 'react';

export interface DataMigrationContextType {
  useSupabaseData: boolean;
  toggleDataSource: () => void;
  isReady: boolean;
}

export const DataMigrationContext = createContext<
  DataMigrationContextType | undefined
>(undefined);

