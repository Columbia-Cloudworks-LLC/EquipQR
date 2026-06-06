import React from 'react';
import { DollarSign, MapPin } from 'lucide-react';

type PartLookupPartMetaProps = {
  location?: string | null;
  defaultUnitCost?: number | null;
};

export function PartLookupPartMeta({ location, defaultUnitCost }: PartLookupPartMetaProps) {
  if (!location && !defaultUnitCost) {
    return null;
  }

  return (
    <>
      {location && (
        <span className="flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {location}
        </span>
      )}
      {defaultUnitCost != null && (
        <span className="flex items-center gap-1">
          <DollarSign className="h-3 w-3" />
          {defaultUnitCost.toFixed(2)}
        </span>
      )}
    </>
  );
}
