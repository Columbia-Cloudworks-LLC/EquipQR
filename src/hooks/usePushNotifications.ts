/**
 * Push Notifications Hook
 * 
 * Manages Web Push notification subscriptions for the PWA.
 * 
 * Features:
 * - Check if push notifications are supported
 * - Request notification permission
 * - Subscribe/unsubscribe from push notifications
 * - Sync subscriptions with the database
 * 
 * @example
 * const { isSupported, permission, subscribe, unsubscribe } = usePushNotifications();
 * 
 * // Check if supported and request permission
 * if (isSupported && permission === 'default') {
 *   await subscribe();
 * }
 */

import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

// VAPID public key from environment
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

/**
 * Convert a base64 string to Uint8Array for applicationServerKey
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Convert ArrayBuffer to base64 string for storage
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export interface PushNotificationState {
  /** Whether push notifications are supported in this browser */
  isSupported: boolean;
  /** Whether service worker is registered */
  isServiceWorkerRegistered: boolean;
  /** Current notification permission status */
  permission: NotificationPermission | 'unsupported';
  /** Whether the user is currently subscribed */
  isSubscribed: boolean;
  /** Loading state */
  isLoading: boolean;
}

export function usePushNotifications() {
  const queryClient = useQueryClient();
  const [state, setState] = useState<PushNotificationState>({
    isSupported: false,
    isServiceWorkerRegistered: false,
    permission: 'unsupported',
    isSubscribed: false,
    isLoading: true,
  });

  // Check if push is supported
  const isSupported = 
    'serviceWorker' in navigator && 
    'PushManager' in window && 
    'Notification' in window;

  // Query current subscription status from database
  const { data: existingSubscription, isLoading: isLoadingSubscription } = useQuery({
    queryKey: ['push-subscription'],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return null;

      // Check if service worker is registered before accessing ready
      const registrations = await navigator.serviceWorker.getRegistrations();
      const activeRegistration = registrations.find(r => r.active?.scriptURL.includes('sw.js'));
      
      if (!activeRegistration) return null;

      // Get current push subscription from browser
      const subscription = await activeRegistration.pushManager.getSubscription();
      
      if (!subscription) return null;

      // Check if this subscription exists in the database
      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('id, endpoint')
        .eq('user_id', userData.user.id)
        .eq('endpoint', subscription.endpoint)
        .maybeSingle();

      if (error) {
        logger.error('Error checking push subscription', error);
        return null;
      }

      return data;
    },
    enabled: isSupported,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Initialize state
  useEffect(() => {
    const initState = async () => {
      if (!isSupported) {
        setState({
          isSupported: false,
          isServiceWorkerRegistered: false,
          permission: 'unsupported',
          isSubscribed: false,
          isLoading: false,
        });
        return;
      }

      try {
        // Check service worker registration
        const registrations = await navigator.serviceWorker.getRegistrations();
        const isRegistered = registrations.some(r => r.active?.scriptURL.includes('sw.js'));

        // Check notification permission
        const permission = Notification.permission;

        // Check if subscribed
        let isSubscribed = false;
        if (isRegistered) {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          isSubscribed = !!subscription && !!existingSubscription;
        }

        setState({
          isSupported: true,
          isServiceWorkerRegistered: isRegistered,
          permission,
          isSubscribed,
          isLoading: false,
        });
      } catch (error) {
        logger.error('Error initializing push notification state', error);
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    if (!isLoadingSubscription) {
      initState();
    }
  }, [isSupported, existingSubscription, isLoadingSubscription]);

  // Subscribe mutation
  const subscribeMutation = useMutation({
    mutationFn: async () => {
      if (!isSupported) {
        throw new Error('Push notifications are not supported in this browser');
      }

      if (!VAPID_PUBLIC_KEY) {
        throw new Error('Push notifications are not configured');
      }

      // Get user
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error('You must be logged in to enable push notifications');
      }

      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Notification permission denied');
      }

      // Register service worker if not already registered
      let registration = await navigator.serviceWorker.getRegistration('/sw.js');
      if (!registration) {
        registration = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;
      }

      // Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // Extract keys
      const p256dhKey = subscription.getKey('p256dh');
      const authKey = subscription.getKey('auth');

      if (!p256dhKey || !authKey) {
        throw new Error('Failed to get push subscription keys');
      }

      // Save to database
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: userData.user.id,
          endpoint: subscription.endpoint,
          p256dh: arrayBufferToBase64(p256dhKey),
          auth: arrayBufferToBase64(authKey),
          user_agent: navigator.userAgent,
        }, {
          onConflict: 'user_id,endpoint',
        });

      if (error) {
        // If save failed, unsubscribe from push to keep state consistent
        await subscription.unsubscribe();
        throw error;
      }

      return subscription;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['push-subscription'] });
      setState(prev => ({ ...prev, isSubscribed: true, permission: 'granted' }));
      toast.success('Push notifications enabled');
    },
    onError: (error) => {
      logger.error('Error subscribing to push notifications', error);
      const message = error instanceof Error ? error.message : 'Failed to enable push notifications';
      toast.error(message);
    },
  });

  // Unsubscribe mutation
  const unsubscribeMutation = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        throw new Error('You must be logged in');
      }

      // Check if service worker is registered before accessing ready
      const registrations = await navigator.serviceWorker.getRegistrations();
      const activeRegistration = registrations.find(r => r.active?.scriptURL.includes('sw.js'));
      
      if (!activeRegistration) {
        // No active service worker, nothing to unsubscribe
        return;
      }

      // Get current subscription
      const subscription = await activeRegistration.pushManager.getSubscription();

      if (subscription) {
        // Remove from database
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', userData.user.id)
          .eq('endpoint', subscription.endpoint);

        // Unsubscribe from push
        await subscription.unsubscribe();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['push-subscription'] });
      setState(prev => ({ ...prev, isSubscribed: false }));
      toast.success('Push notifications disabled');
    },
    onError: (error) => {
      logger.error('Error unsubscribing from push notifications', error);
      toast.error('Failed to disable push notifications');
    },
  });

  // Subscribe function
  const subscribe = useCallback(() => {
    return subscribeMutation.mutateAsync();
  }, [subscribeMutation]);

  // Unsubscribe function
  const unsubscribe = useCallback(() => {
    return unsubscribeMutation.mutateAsync();
  }, [unsubscribeMutation]);

  // Toggle function
  const toggle = useCallback(async () => {
    if (state.isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  }, [state.isSubscribed, subscribe, unsubscribe]);

  return {
    ...state,
    subscribe,
    unsubscribe,
    toggle,
    isSubscribing: subscribeMutation.isPending,
    isUnsubscribing: unsubscribeMutation.isPending,
  };
}

export default usePushNotifications;
