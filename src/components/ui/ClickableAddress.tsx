import React from 'react';
import { ExternalLink } from 'lucide-react';
import { buildGoogleMapsUrl, buildGoogleMapsUrlFromCoords } from '@/utils/effectiveLocation';

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
}) => {
  if (!address && (lat == null || lng == null)) {
    return null;
  }

  const url = address
    ? buildGoogleMapsUrl(address)
    : buildGoogleMapsUrlFromCoords(lat!, lng!);

  const displayText = address || `${lat!.toFixed(6)}, ${lng!.toFixed(6)}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 text-primary hover:text-primary/80 hover:underline transition-colors ${className}`}
      title="Open in Google Maps"
    >
      <span>{displayText}</span>
      {showIcon && <ExternalLink className="h-3 w-3 flex-shrink-0" />}
    </a>
  );
};

export default ClickableAddress;
