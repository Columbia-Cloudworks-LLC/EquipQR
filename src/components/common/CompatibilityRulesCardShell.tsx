import React from 'react';
import { AlertCircle, Settings2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type CompatibilityRulesCardShellProps = {
  title: string;
  description: string;
  validRulesCount: number;
  matchCount: number;
  isLoadingMfrs: boolean;
  hasManufacturers: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function CompatibilityRulesCardShell({
  title,
  description,
  validRulesCount,
  matchCount,
  isLoadingMfrs,
  hasManufacturers,
  children,
  footer,
}: CompatibilityRulesCardShellProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            {title}
          </div>
          {validRulesCount > 0 && (
            <Badge variant="secondary" className="font-normal">
              Matches {matchCount} equipment
            </Badge>
          )}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoadingMfrs ? (
          <div className="space-y-2">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-10 bg-muted rounded animate-pulse" />
            ))}
          </div>
        ) : !hasManufacturers ? (
          <div className="text-sm text-muted-foreground text-center py-4">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No equipment found in your organization.</p>
            <p>Add equipment first to define compatibility rules.</p>
          </div>
        ) : (
          <>
            {children}
            {footer}
          </>
        )}
      </CardContent>
    </Card>
  );
}
