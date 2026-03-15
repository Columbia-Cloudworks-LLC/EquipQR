import React from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/use-mobile';

interface TabCount {
  'work-orders'?: number;
  notes?: number;
  parts?: number;
  images?: number;
  scans?: number;
}

interface ResponsiveEquipmentTabsProps {
  activeTab: string;
  onTabChange: (value: string) => void;
  children: React.ReactNode;
  counts?: TabCount;
}

function TabLabel({ label, count }: { label: string; count?: number }) {
  if (!count || count <= 0) return <>{label}</>;
  return (
    <span className="inline-flex items-center gap-1">
      {label}
      <Badge variant="secondary" className="h-4 min-w-[16px] px-1 text-[10px] leading-none font-medium">
        {count}
      </Badge>
    </span>
  );
}

const ResponsiveEquipmentTabs: React.FC<ResponsiveEquipmentTabsProps> = ({
  activeTab,
  onTabChange,
  children,
  counts,
}) => {
  const isMobile = useIsMobile();

  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <div className={`sticky z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-1 ${
        isMobile ? 'top-[60px] -mx-3 px-3 border-b' : 'top-0'
      }`}>
        <ScrollArea className="w-full">
          <TabsList className={`grid w-full ${isMobile ? 'grid-cols-3' : 'grid-cols-7'} ${isMobile ? 'h-auto' : ''}`}>
            <TabsTrigger value="details" className={isMobile ? 'text-xs py-2' : ''}>
              Details
            </TabsTrigger>
            <TabsTrigger
              value="work-orders"
              className={isMobile ? 'text-xs py-2' : ''}
              onClick={() => onTabChange('work-orders')}
            >
              <TabLabel label={isMobile ? 'Orders' : 'Work Orders'} count={counts?.['work-orders']} />
            </TabsTrigger>
            <TabsTrigger value="notes" className={isMobile ? 'text-xs py-2' : ''}>
              <TabLabel label="Notes" count={counts?.notes} />
            </TabsTrigger>
            {!isMobile && (
              <>
                <TabsTrigger value="parts">
                  <TabLabel label="Parts" count={counts?.parts} />
                </TabsTrigger>
                <TabsTrigger value="images">
                  <TabLabel label="Images" count={counts?.images} />
                </TabsTrigger>
                <TabsTrigger value="scans">Scans</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </>
            )}
          </TabsList>
        </ScrollArea>

        {isMobile && (
          <div className="mt-2">
            <TabsList className="grid w-full grid-cols-4 h-auto">
              <TabsTrigger value="parts" className="text-xs py-2">
                <TabLabel label="Parts" count={counts?.parts} />
              </TabsTrigger>
              <TabsTrigger value="images" className="text-xs py-2">
                <TabLabel label="Images" count={counts?.images} />
              </TabsTrigger>
              <TabsTrigger value="scans" className="text-xs py-2">
                Scans
              </TabsTrigger>
              <TabsTrigger value="history" className="text-xs py-2">
                History
              </TabsTrigger>
            </TabsList>
          </div>
        )}
      </div>

      <div className={isMobile ? "px-4 mt-4" : "mt-6"}>
        {children}
      </div>
    </Tabs>
  );
};

export default ResponsiveEquipmentTabs;
