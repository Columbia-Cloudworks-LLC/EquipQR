
import React from 'react';
import { useTheme } from 'next-themes';

interface LogoProps {
  variant?: 'default' | 'white' | 'black' | 'grayscale';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ 
  variant = 'default', 
  size = 'md', 
  className = '' 
}) => {
  const { theme, systemTheme } = useTheme();
  
  // Determine the current theme
  const currentTheme = theme === 'system' ? systemTheme : theme;
  
  // Select logo variant based on theme if variant is 'default'
  const getLogoVariant = () => {
    if (variant !== 'default') return variant;
    return currentTheme === 'dark' ? 'white' : 'black';
  };
  
  const logoVariant = getLogoVariant();
  
  // Size classes
  const sizeClasses = {
    sm: 'h-6',
    md: 'h-8',
    lg: 'h-12',
    xl: 'h-16'
  };
  
  return (
    <img
      src="/eqr-icons/inverse.png"
      alt="EquipQR"
      className={`${sizeClasses[size]} w-auto ${className}`}
      data-logo-variant={logoVariant}
    />
  );
};

export default Logo;
