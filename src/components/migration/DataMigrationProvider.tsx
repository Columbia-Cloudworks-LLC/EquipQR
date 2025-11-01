
import React, { useState, useEffect } from 'react';
import { useSession } from '@/hooks/useSession';
import {
  DataMigrationContext,
  type DataMigrationContextType,
} from './data-migration-context';

interface DataMigrationProviderProps {
  children: React.ReactNode;
}

export const DataMigrationProvider: React.FC<DataMigrationProviderProps> = ({ children }) => {
  const { sessionData, isLoading } = useSession();
  const [useSupabaseData, setUseSupabaseData] = useState(false);

  // Check if we have valid session data and should use Supabase
  useEffect(() => {
    if (!isLoading && sessionData?.currentOrganizationId) {
      // Only switch to Supabase if we have valid session data
      setUseSupabaseData(true);
    } else if (!isLoading && !sessionData) {
      // Fall back to mock data if no session
      setUseSupabaseData(false);
    }
  }, [isLoading, sessionData]);

  const toggleDataSource = () => {
    setUseSupabaseData(prev => !prev);
  };

  const isReady = !isLoading;

  const value: DataMigrationContextType = {
    useSupabaseData,
    toggleDataSource,
    isReady
  };

  return (
    <DataMigrationContext.Provider value={value}>
      {children}
    </DataMigrationContext.Provider>
  );
};
