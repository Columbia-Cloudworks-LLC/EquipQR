import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Filter } from 'lucide-react';
import type { NotesVisibilityFilterValue } from '@/components/common/noteCardPermissions';

interface NotesVisibilityFilterProps {
  value: NotesVisibilityFilterValue;
  onChange: (value: NotesVisibilityFilterValue) => void;
  className?: string;
}

const NotesVisibilityFilter: React.FC<NotesVisibilityFilterProps> = ({
  value,
  onChange,
  className,
}) => (
  <div className={className}>
    <Select value={value} onValueChange={(v) => onChange(v as NotesVisibilityFilterValue)}>
      <SelectTrigger className="h-9 w-[160px]" aria-label="Filter notes by visibility">
        <Filter className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <SelectValue placeholder="All notes" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All notes</SelectItem>
        <SelectItem value="public">Public only</SelectItem>
        <SelectItem value="private">My private</SelectItem>
      </SelectContent>
    </Select>
  </div>
);

export default NotesVisibilityFilter;
