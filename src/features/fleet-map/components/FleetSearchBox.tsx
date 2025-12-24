import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface FleetSearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const FleetSearchBox: React.FC<FleetSearchBoxProps> = ({
  value,
  onChange,
  placeholder = "Search by name, manufacturer, model, or serial...",
  disabled = false
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-4 w-4" />
          Search Equipment
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Input
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
        />
      </CardContent>
    </Card>
  );
};
