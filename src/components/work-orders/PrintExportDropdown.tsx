import React from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface PrintExportDropdownProps {
  onDownloadPDF: () => void;
  disabled?: boolean;
}

const PrintExportDropdown: React.FC<PrintExportDropdownProps> = ({
  onDownloadPDF,
  disabled = false
}) => {
  const isMobile = useIsMobile();

  return (
    <Button 
      variant="outline" 
      size={isMobile ? "sm" : "default"}
      disabled={disabled}
      onClick={onDownloadPDF}
      className="flex items-center gap-2"
    >
      <Download className="h-4 w-4" />
      <span>Download PDF</span>
    </Button>
  );
};

export default PrintExportDropdown;