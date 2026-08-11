import React, { useEffect, useState } from 'react';
import { Building, Users as UsersIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type WorkspaceAvatarKind = 'organization' | 'team';

interface WorkspaceAvatarProps {
  kind: WorkspaceAvatarKind;
  /** Display URL when an image is available; null/undefined uses the generic icon. */
  src?: string | null;
  /**
   * Accessible name for the image. Organization logos use `{name} logo`;
   * team images use `{name} team image`.
   */
  name: string;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

const SIZE_CLASSES = {
  xs: 'h-4 w-4',
  sm: 'h-5 w-5',
  md: 'h-6 w-6',
} as const;

const ICON_SIZE_CLASSES = {
  xs: 'h-2.5 w-2.5',
  sm: 'h-3 w-3',
  md: 'h-3.5 w-3.5',
} as const;

/**
 * Compact org/team avatar for TopBar workspace context.
 * Shows the uploaded image when present; falls back to Building / Users on
 * missing src or load error (same pattern as sidebar OrganizationSwitcher).
 */
const WorkspaceAvatar: React.FC<WorkspaceAvatarProps> = ({
  kind,
  src,
  name,
  size = 'sm',
  className,
}) => {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [src]);

  const showImage = Boolean(src) && !imageError;
  const FallbackIcon = kind === 'organization' ? Building : UsersIcon;
  const alt =
    kind === 'organization' ? `${name} logo` : `${name} team image`;

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded bg-primary text-primary-foreground',
        SIZE_CLASSES[size],
        className,
      )}
      aria-hidden={showImage ? undefined : true}
    >
      {showImage ? (
        <img
          src={src!}
          alt={alt}
          className="h-full w-full object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <FallbackIcon className={ICON_SIZE_CLASSES[size]} aria-hidden="true" />
      )}
    </span>
  );
};

export default WorkspaceAvatar;
