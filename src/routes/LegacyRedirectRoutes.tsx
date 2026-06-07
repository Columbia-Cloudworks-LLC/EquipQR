import { Route } from 'react-router-dom';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { SimpleOrganizationProvider } from '@/contexts/SimpleOrganizationProvider';
import { RedirectToEquipment, RedirectToWorkOrder } from '@/routes/redirects';

export const legacyRedirectRouteElements = (
  <>
    <Route
      path="/equipment/:equipmentId"
      element={
        <ProtectedRoute>
          <SimpleOrganizationProvider>
            <RedirectToEquipment />
          </SimpleOrganizationProvider>
        </ProtectedRoute>
      }
    />
    <Route
      path="/work-orders/:workOrderId"
      element={
        <ProtectedRoute>
          <SimpleOrganizationProvider>
            <RedirectToWorkOrder />
          </SimpleOrganizationProvider>
        </ProtectedRoute>
      }
    />
  </>
);
