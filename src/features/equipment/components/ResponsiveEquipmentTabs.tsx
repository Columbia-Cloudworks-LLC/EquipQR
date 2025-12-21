import React from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';

interface ResponsiveEquipmentTabsProps {
  activeTab: string;
  onTabChange: (value: string) => void;
  children: React.ReactNode;
}

const ResponsiveEquipmentTabs: React.FC<ResponsiveEquipmentTabsProps> = ({
  activeTab,
  onTabChange,
  children,
}) => {
  const isMobile = useIsMobile();

  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <div className={isMobile ? "px-4" : ""}>
        <ScrollArea className="w-full">
          <TabsList className={`grid w-full ${isMobile ? 'grid-cols-3' : 'grid-cols-5'} ${isMobile ? 'h-auto' : ''}`}>
            <TabsTrigger value="details" className={isMobile ? 'text-xs py-2' : ''}>
              Details
            </TabsTrigger>
            <TabsTrigger value="work-orders" className={isMobile ? 'text-xs py-2' : ''}>
              {isMobile ? 'Orders' : 'Work Orders'}
            </TabsTrigger>
            <TabsTrigger value="notes" className={isMobile ? 'text-xs py-2' : ''}>
              Notes
            </TabsTrigger>
            {!isMobile && (
              <>
                <TabsTrigger value="images">Images</TabsTrigger>
                <TabsTrigger value="scans">Scans</TabsTrigger>
              </>
            )}
          </TabsList>
        </ScrollArea>
      </div>

      {/* Mobile: Second row of tabs */}
      {isMobile && (
        <div className="px-4 mt-2">
          <TabsList className="grid w-full grid-cols-2 h-auto">
            <TabsTrigger value="images" className="text-xs py-2">
              Images
            </TabsTrigger>
            <TabsTrigger value="scans" className="text-xs py-2">
              Scans
            </TabsTrigger>
          </TabsList>
        </div>
      )}

      <div className={isMobile ? "px-4 mt-4" : "mt-6"}>
        {children}
      </div>
    </Tabs>
  );
};

export default ResponsiveEquipmentTabs;