import { useToast } from '@/hooks/use-toast';

export type ToastVariant = 'success' | 'info' | 'warning' | 'error';

interface AppToastOptions {
  title?: string;
  description?: string;
  duration?: number;
  variant?: ToastVariant;
}

export const useAppToast = () => {
  const { toast } = useToast();

  const showToast = ({ title, description, duration, variant = 'info' }: AppToastOptions) => {
    const variantConfig = {
      success: {
        title: title || 'Success',
        variant: 'default' as const,
      },
      info: {
        title: title || 'Information',
        variant: 'default' as const,
      },
      warning: {
        title: title || 'Warning',
        variant: 'destructive' as const,
      },
      error: {
        title: title || 'Error',
        variant: 'destructive' as const,
      },
    };

    const config = variantConfig[variant];

    toast({
      title: config.title,
      description,
      duration,
      variant: config.variant,
    });
  };

  const success = (options: Omit<AppToastOptions, 'variant'>) => 
    showToast({ ...options, variant: 'success' });

  const info = (options: Omit<AppToastOptions, 'variant'>) => 
    showToast({ ...options, variant: 'info' });

  const warning = (options: Omit<AppToastOptions, 'variant'>) => 
    showToast({ ...options, variant: 'warning' });

  const error = (options: Omit<AppToastOptions, 'variant'>) => 
    showToast({ ...options, variant: 'error' });

  return {
    toast: showToast,
    success,
    info,
    warning,
    error,
  };
};

