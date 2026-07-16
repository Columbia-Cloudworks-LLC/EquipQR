import React from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface EquipmentImportMenuProps {
  onImportCsv: () => void;
}

const EquipmentImportMenu: React.FC<EquipmentImportMenuProps> = ({ onImportCsv }) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8"
          aria-label="Import equipment"
        >
          <Upload className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          Import format
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={onImportCsv} className="gap-2 cursor-pointer">
          <Upload className="h-4 w-4 text-muted-foreground" />
          <div className="flex flex-col">
            <span className="text-sm">Import CSV</span>
            <span className="text-[10px] text-muted-foreground">Add equipment from file</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default EquipmentImportMenu;
