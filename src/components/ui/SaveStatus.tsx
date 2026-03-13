import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, AlertCircle, Wifi, WifiOff } from 'lucide-react';

interface SaveStatusProps {
  status: 'saving' | 'saved' | 'error' | 'offline';
  lastSaved?: Date;
  className?: string;
}

export const SaveStatus: React.FC<SaveStatusProps> = ({ status, lastSaved, className }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'saving':
        return {
          icon: Clock,
          text: 'Saving...',
          className: 'bg-info/20 text-info border-info/30'
        };
      case 'saved':
        return {
          icon: CheckCircle,
          text: lastSaved ? `Saved ${formatTime(lastSaved)}` : 'Saved',
          className: 'bg-success/20 text-success border-success/30'
        };
      case 'error':
        return {
          icon: AlertCircle,
          text: 'Save failed',
          className: 'bg-destructive/20 text-destructive border-destructive/30'
        };
      case 'offline':
        return {
          icon: WifiOff,
          text: 'Offline',
          className: 'bg-muted text-foreground border-border'
        };
      default:
        return {
          icon: Wifi,
          text: 'Ready',
          className: 'bg-muted text-foreground border-border'
        };
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (seconds < 60) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <Badge className={`${config.className} ${className}`}>
      <Icon className="h-3 w-3 mr-1" />
      {config.text}
    </Badge>
  );
};
