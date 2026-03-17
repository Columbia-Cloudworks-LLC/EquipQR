import React from 'react';
import { ExternalLink } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { buildGoogleMapsUrl, buildGoogleMapsUrlFromCoords } from '@/utils/effectiveLocation';

function extractCityState(address: string): string | null {
  const parts = address.split(',').map(p => p.trim());
  if (parts.length >= 3) {
    return `${parts[parts.length - 3]}, ${parts[parts.length - 2]}`;
  }
  if (parts.length === 2) {
    return address;
  }
  return null;
}

interface ClickableAddressProps {
  /** The formatted address text to display */
  address?: string;
  /** Latitude for coordinate-based link (used if address is not provided) */
  lat?: number;
  /** Longitude for coordinate-based link (used if address is not provided) */
  lng?: number;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show the external link icon */
  showIcon?: boolean;
  /** When true, shows only city/state with full address in tooltip */
  compact?: boolean;
}

/**
 * Renders an address as a clickable link that opens Google Maps directions.
 * 
 * Supports two modes:
 * 1. Address string - opens Google Maps with the address as destination
 * 2. Coordinates - opens Google Maps with lat/lng as destination
 */
const ClickableAddress: React.FC<ClickableAddressProps> = ({
  address,
  lat,
  lng,
  className = '',
  showIcon = true,
  compact = false,
}) => {
  if (!address && (lat == null || lng == null)) {
    return null;
  }

  const url = address
    ? buildGoogleMapsUrl(address)
    : buildGoogleMapsUrlFromCoords(lat!, lng!);

  const fullText = address || `${lat!.toFixed(6)}, ${lng!.toFixed(6)}`;
  const shortText = compact && address ? (extractCityState(address) ?? fullText) : fullText;
  const needsTooltip = compact && shortText !== fullText;

  const link = (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 text-primary hover:text-primary/80 hover:underline transition-colors ${className}`}
      title={needsTooltip ? undefined : 'Open in Google Maps'}
      aria-label={`${fullText} (opens in new tab)`}
    >
      <span className={compact ? 'truncate' : undefined}>{shortText}</span>
      {showIcon && <ExternalLink className="h-3 w-3 flex-shrink-0" />}
    </a>
  );

  if (needsTooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent>{fullText}</TooltipContent>
      </Tooltip>
    );
  }

  return link;
};

export default ClickableAddress;
