import React from 'react';
import EquipQRIcon from './EquipQRIcon';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  /**
   * Pass title="" to make the icon decorative (when a sibling element
   * already provides the accessible label, e.g. a visible "EquipQR" text node).
   */
  title?: string;
}

const sizeClasses: Record<NonNullable<LogoProps['size']>, string> = {
  sm: 'h-6',
  md: 'h-8',
  lg: 'h-12',
  xl: 'h-16',
};

const Logo: React.FC<LogoProps> = ({
  size = 'md',
  className = '',
  title = 'EquipQR',
}) => (
  <EquipQRIcon
    title={title}
    className={`${sizeClasses[size]} w-auto ${className}`}
  />
);

export default Logo;
