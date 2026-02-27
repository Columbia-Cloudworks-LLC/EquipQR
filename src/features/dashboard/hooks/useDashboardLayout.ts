import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/utils/logger';
import { dashboardPreferences } from '@/lib/queryKeys';
import { generateDefaultLayout, WIDGET_REGISTRY } from '@/features/dashboard/registry/widgetRegistry';

/** localStorage key scoped to user + organization */
function storageKey(userId: string, orgId: string): string {
  return `equipqr_dashboard_layout_${userId}_${orgId}`;
}

interface StoredPreferences {
  activeWidgets: string[];
  updatedAt: string;
}

/** Safely read preferences from localStorage.
 *  Handles both the new slim format and the legacy format that included a `layouts` key.
 */
function readFromLocalStorage(userId: string, orgId: string): StoredPreferences | null {
  try {
    const raw = localStorage.getItem(storageKey(userId, orgId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    // Accept both new and legacy shapes — only activeWidgets is required.
    if (parsed && Array.isArray(parsed.activeWidgets) && typeof parsed.updatedAt === 'string') {
      return { activeWidgets: parsed.activeWidgets as string[], updatedAt: parsed.updatedAt as string };
    }
    return null;
  } catch {
    try { localStorage.removeItem(storageKey(userId, orgId)); } catch { /* noop */ }
    return null;
  }
}

/** Write preferences to localStorage */
function writeToLocalStorage(userId: string, orgId: string, prefs: StoredPreferences): void {
  try {
    localStorage.setItem(storageKey(userId, orgId), JSON.stringify(prefs));
  } catch {
    logger.error('Failed to write dashboard preferences to localStorage');
  }
}

interface UseDashboardLayoutResult {
  activeWidgets: string[];
  isLoading: boolean;
  updateWidgetOrder: (newOrder: string[]) => void;
  addWidget: (widgetId: string) => void;
  removeWidget: (widgetId: string) => void;
  resetToDefault: () => void;
}

/**
 * Hook managing dashboard widget list with two-tier persistence:
 * 1. localStorage for instant load (keyed to user+org)
 * 2. Supabase for cross-device durability (debounce-synced)
 *
 * Layout is now purely an ordered list of widget IDs — no per-breakpoint
 * position/size data. CSS grid column spans are derived from the widget
 * registry's `defaultSize.w` at render time.
 */
export function useDashboardLayout(organizationId: string | undefined): UseDashboardLayoutResult {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  const [activeWidgets, setActiveWidgets] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
        debounceTimer.current = null;
      }
    };
  }, [userId, organizationId]);

  // Initialize from localStorage or defaults when org/user changes
  useEffect(() => {
    if (!userId || !organizationId) return;

    const stored = readFromLocalStorage(userId, organizationId);
    if (stored) {
      setActiveWidgets(stored.activeWidgets);
    } else {
      const defaults = generateDefaultLayout();
      setActiveWidgets(defaults.activeWidgets);
    }
    setInitialized(true);
  }, [userId, organizationId]);

  // Background fetch from Supabase to sync across devices
  const { data: supabasePrefs } = useQuery({
    queryKey: dashboardPreferences.byUserOrg(userId ?? '', organizationId ?? ''),
    queryFn: async () => {
      if (!userId || !organizationId) return null;
      const { data, error } = await supabase
        .from('user_dashboard_preferences')
        .select('active_widgets, updated_at')
        .eq('user_id', userId)
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (error) {
        logger.error('Failed to fetch dashboard preferences from Supabase', error);
        return null;
      }
      return data;
    },
    enabled: !!userId && !!organizationId,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Merge: if Supabase version is newer, overwrite local
  useEffect(() => {
    if (!supabasePrefs || !userId || !organizationId || !initialized) return;

    const localPrefs = readFromLocalStorage(userId, organizationId);
    const supaUpdatedAt = new Date(supabasePrefs.updated_at).getTime();
    const localUpdatedAt = localPrefs ? new Date(localPrefs.updatedAt).getTime() : 0;

    if (supaUpdatedAt > localUpdatedAt) {
      const supaWidgets = supabasePrefs.active_widgets as string[];
      const validWidgets = supaWidgets.filter((id) => WIDGET_REGISTRY.has(id));

      if (validWidgets.length > 0) {
        setActiveWidgets(validWidgets);
        writeToLocalStorage(userId, organizationId, {
          activeWidgets: validWidgets,
          updatedAt: supabasePrefs.updated_at,
        });
      }
    }
  }, [supabasePrefs, userId, organizationId, initialized]);

  // Supabase upsert mutation
  const upsertMutation = useMutation({
    mutationFn: async (prefs: {
      activeWidgets: string[];
      targetUserId: string;
      targetOrgId: string;
    }) => {
      const { error } = await supabase
        .from('user_dashboard_preferences')
        .upsert(
          {
            user_id: prefs.targetUserId,
            organization_id: prefs.targetOrgId,
            active_widgets: prefs.activeWidgets,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,organization_id' }
        );

      if (error) {
        logger.error('Failed to save dashboard preferences to Supabase', error);
        throw error;
      }

      return { targetUserId: prefs.targetUserId, targetOrgId: prefs.targetOrgId };
    },
    onSuccess: (result) => {
      if (result) {
        queryClient.invalidateQueries({
          queryKey: dashboardPreferences.byUserOrg(result.targetUserId, result.targetOrgId),
        });
      }
    },
  });

  // Debounced sync to Supabase
  const debounceSyncToSupabase = useCallback(
    (widgets: string[]) => {
      if (!userId || !organizationId) return;

      const targetUserId = userId;
      const targetOrgId = organizationId;

      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        upsertMutation.mutate({ activeWidgets: widgets, targetUserId, targetOrgId });
      }, 2000);
    },
    [userId, organizationId, upsertMutation]
  );

  // Persist: write to localStorage immediately, debounce to Supabase
  const persist = useCallback(
    (widgets: string[]) => {
      if (!userId || !organizationId) return;
      writeToLocalStorage(userId, organizationId, {
        activeWidgets: widgets,
        updatedAt: new Date().toISOString(),
      });
      debounceSyncToSupabase(widgets);
    },
    [userId, organizationId, debounceSyncToSupabase]
  );

  const updateWidgetOrder = useCallback(
    (newOrder: string[]) => {
      setActiveWidgets(newOrder);
      persist(newOrder);
    },
    [persist]
  );

  const addWidget = useCallback(
    (widgetId: string) => {
      if (activeWidgets.includes(widgetId) || !WIDGET_REGISTRY.has(widgetId)) return;
      const newWidgets = [...activeWidgets, widgetId];
      setActiveWidgets(newWidgets);
      persist(newWidgets);
    },
    [activeWidgets, persist]
  );

  const removeWidget = useCallback(
    (widgetId: string) => {
      const newWidgets = activeWidgets.filter((id) => id !== widgetId);
      setActiveWidgets(newWidgets);
      persist(newWidgets);
    },
    [activeWidgets, persist]
  );

  const resetToDefault = useCallback(() => {
    const defaults = generateDefaultLayout();
    setActiveWidgets(defaults.activeWidgets);
    persist(defaults.activeWidgets);
  }, [persist]);

  return {
    activeWidgets,
    isLoading: !initialized,
    updateWidgetOrder,
    addWidget,
    removeWidget,
    resetToDefault,
  };
}
