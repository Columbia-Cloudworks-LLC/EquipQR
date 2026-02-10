import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/utils/logger';
import { dashboardPreferences } from '@/lib/queryKeys';
import { generateDefaultLayout, WIDGET_REGISTRY } from '@/features/dashboard/registry/widgetRegistry';
import type { Layout } from 'react-grid-layout';

/** localStorage key scoped to user + organization */
function storageKey(userId: string, orgId: string): string {
  return `equipqr_dashboard_layout_${userId}_${orgId}`;
}

interface StoredPreferences {
  layouts: Record<string, Layout[]>;
  activeWidgets: string[];
  updatedAt: string;
}

/** Safely read preferences from localStorage */
function readFromLocalStorage(userId: string, orgId: string): StoredPreferences | null {
  try {
    const raw = localStorage.getItem(storageKey(userId, orgId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredPreferences;
    // Validate basic structure
    if (parsed && typeof parsed.layouts === 'object' && Array.isArray(parsed.activeWidgets)) {
      return parsed;
    }
    return null;
  } catch {
    // Corrupted JSON — remove and return null
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
  layouts: Record<string, Layout[]>;
  activeWidgets: string[];
  isLoading: boolean;
  updateLayout: (newLayouts: Record<string, Layout[]>) => void;
  addWidget: (widgetId: string) => void;
  removeWidget: (widgetId: string) => void;
  resetToDefault: () => void;
}

/**
 * Hook managing dashboard layout lifecycle with two-tier persistence:
 * 1. localStorage for instant load (keyed to user+org)
 * 2. Supabase for cross-device durability (debounce-synced)
 *
 * When organizationId changes, layout is reloaded for the new org.
 */
export function useDashboardLayout(organizationId: string | undefined): UseDashboardLayoutResult {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  // Local state for instant rendering
  const [layouts, setLayouts] = useState<Record<string, Layout[]>>({});
  const [activeWidgets, setActiveWidgets] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear debounce timer on unmount or when org/user changes
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
      setLayouts(stored.layouts);
      setActiveWidgets(stored.activeWidgets);
    } else {
      const defaults = generateDefaultLayout();
      setLayouts(defaults.layouts);
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
        .select('layouts, active_widgets, updated_at')
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
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: false,
  });

  // Merge: if Supabase version is newer, overwrite local
  useEffect(() => {
    if (!supabasePrefs || !userId || !organizationId || !initialized) return;

    const localPrefs = readFromLocalStorage(userId, organizationId);
    const supaUpdatedAt = new Date(supabasePrefs.updated_at).getTime();
    const localUpdatedAt = localPrefs ? new Date(localPrefs.updatedAt).getTime() : 0;

    if (supaUpdatedAt > localUpdatedAt) {
      const supaLayouts = supabasePrefs.layouts as Record<string, Layout[]>;
      const supaWidgets = supabasePrefs.active_widgets as string[];

      // Validate widgets still exist in registry
      const validWidgets = supaWidgets.filter((id) => WIDGET_REGISTRY.has(id));

      if (validWidgets.length > 0 && supaLayouts && typeof supaLayouts === 'object') {
        setLayouts(supaLayouts);
        setActiveWidgets(validWidgets);
        writeToLocalStorage(userId, organizationId, {
          layouts: supaLayouts,
          activeWidgets: validWidgets,
          updatedAt: supabasePrefs.updated_at,
        });
      }
    }
  }, [supabasePrefs, userId, organizationId, initialized]);

  // Supabase upsert mutation — payload includes org/user captured at schedule
  // time so a pending debounce never writes to the wrong organization.
  const upsertMutation = useMutation({
    mutationFn: async (prefs: {
      layouts: Record<string, Layout[]>;
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
            layouts: prefs.layouts,
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

  // Debounced sync to Supabase — captures userId/organizationId at call time
  const debounceSyncToSupabase = useCallback(
    (prefs: { layouts: Record<string, Layout[]>; activeWidgets: string[] }) => {
      if (!userId || !organizationId) return;

      // Capture current org/user so the debounced callback uses the correct values
      const targetUserId = userId;
      const targetOrgId = organizationId;

      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      debounceTimer.current = setTimeout(() => {
        upsertMutation.mutate({
          ...prefs,
          targetUserId,
          targetOrgId,
        });
      }, 2000);
    },
    [userId, organizationId, upsertMutation]
  );

  // Persist helper: write to localStorage immediately, debounce to Supabase
  const persist = useCallback(
    (newLayouts: Record<string, Layout[]>, newWidgets: string[]) => {
      if (!userId || !organizationId) return;
      const prefs: StoredPreferences = {
        layouts: newLayouts,
        activeWidgets: newWidgets,
        updatedAt: new Date().toISOString(),
      };
      writeToLocalStorage(userId, organizationId, prefs);
      debounceSyncToSupabase({ layouts: newLayouts, activeWidgets: newWidgets });
    },
    [userId, organizationId, debounceSyncToSupabase]
  );

  const updateLayout = useCallback(
    (newLayouts: Record<string, Layout[]>) => {
      setLayouts(newLayouts);
      persist(newLayouts, activeWidgets);
    },
    [persist, activeWidgets]
  );

  const addWidget = useCallback(
    (widgetId: string) => {
      if (activeWidgets.includes(widgetId) || !WIDGET_REGISTRY.has(widgetId)) return;

      const widget = WIDGET_REGISTRY.get(widgetId)!;
      const newWidgets = [...activeWidgets, widgetId];

      // Add to all breakpoint layouts
      const newLayouts = { ...layouts };
      for (const [bp, layout] of Object.entries(newLayouts)) {
        const maxY = layout.reduce((max, item) => Math.max(max, item.y + item.h), 0);
        const cols = bp === 'lg' ? 12 : bp === 'md' ? 10 : bp === 'sm' ? 6 : bp === 'xs' ? 4 : 2;
        newLayouts[bp] = [
          ...layout,
          {
            i: widgetId,
            x: 0,
            y: maxY,
            w: Math.min(widget.defaultSize.w, cols),
            h: widget.defaultSize.h,
            minW: Math.min(widget.minSize?.w ?? 2, cols),
            minH: widget.minSize?.h ?? 2,
            ...(widget.maxSize?.w !== undefined ? { maxW: widget.maxSize.w } : {}),
            ...(widget.maxSize?.h !== undefined ? { maxH: widget.maxSize.h } : {}),
          },
        ];
      }

      setActiveWidgets(newWidgets);
      setLayouts(newLayouts);
      persist(newLayouts, newWidgets);
    },
    [activeWidgets, layouts, persist]
  );

  const removeWidget = useCallback(
    (widgetId: string) => {
      const newWidgets = activeWidgets.filter((id) => id !== widgetId);
      const newLayouts = { ...layouts };
      for (const bp of Object.keys(newLayouts)) {
        newLayouts[bp] = newLayouts[bp].filter((item) => item.i !== widgetId);
      }

      setActiveWidgets(newWidgets);
      setLayouts(newLayouts);
      persist(newLayouts, newWidgets);
    },
    [activeWidgets, layouts, persist]
  );

  const resetToDefault = useCallback(() => {
    const defaults = generateDefaultLayout();
    setLayouts(defaults.layouts);
    setActiveWidgets(defaults.activeWidgets);
    persist(defaults.layouts, defaults.activeWidgets);
  }, [persist]);

  return {
    layouts,
    activeWidgets,
    isLoading: !initialized,
    updateLayout,
    addWidget,
    removeWidget,
    resetToDefault,
  };
}
