import { useNavigate, type To } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface PageBackButtonProps {
  /** Route when there is no browser history to go back to. @default '/' */
  fallbackTo?: To;
  /** Visible label. @default 'Back' */
  label?: string;
  className?: string;
}

export function usePageBackNavigation(fallbackTo: To = '/') {
  const navigate = useNavigate();

  return () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate(fallbackTo);
  };
}

export function PageBackButton({
  fallbackTo = '/',
  label = 'Back',
  className,
}: PageBackButtonProps) {
  const goBack = usePageBackNavigation(fallbackTo);

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={goBack}
      className={cn('-ml-2', className)}
    >
      <ArrowLeft className="h-4 w-4 mr-2" aria-hidden />
      {label}
    </Button>
  );
}
