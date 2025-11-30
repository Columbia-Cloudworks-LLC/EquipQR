
import React from 'react';

interface LogoProps {
  variant?: 'default' | 'white' | 'black' | 'grayscale' | 'purple';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ 
  variant = 'default', 
  size = 'md', 
  className = '' 
}) => {
  // Select logo variant based on theme if variant is 'default'
  // Default uses purple (preferred branding that works on any background)
  const getLogoVariant = () => {
    if (variant !== 'default') return variant;
    // Use purple as default since it works on any background
    return 'purple';
  };
  
  const logoVariant = getLogoVariant();
  
  // Map size prop to icon size suffix
  const getSizeSuffix = (logoSize: string): string => {
    switch (logoSize) {
      case 'sm':
        return 'Small';
      case 'md':
        return 'Medium';
      case 'lg':
      case 'xl':
        return 'Large';
      default:
        return 'Medium';
    }
  };
  
  // Get the icon filename based on variant and size
  const getIconPath = (): string => {
    const sizeSuffix = getSizeSuffix(size);
    
    switch (logoVariant) {
      case 'white':
        return `/icons/EquipQR-White-${sizeSuffix}.png`;
      case 'black':
        return `/icons/EquipQR-Black-${sizeSuffix}.png`;
      case 'grayscale':
        return `/icons/EquipQR-Grey-${sizeSuffix}.png`;
      case 'purple':
        return `/icons/EquipQR-Icon-Purple-${sizeSuffix}.png`;
      default:
        return `/icons/EquipQR-Icon-Purple-${sizeSuffix}.png`;
    }
  };
  
  // Size classes for height
  const sizeClasses = {
    sm: 'h-6',
    md: 'h-8',
    lg: 'h-12',
    xl: 'h-16'
  };
  
  return (
    <img
      src={getIconPath()}
      alt="EquipQR™"
      className={`${sizeClasses[size]} w-auto ${className}`}
      data-logo-variant={logoVariant}
    />
  );
};

export default Logo;
