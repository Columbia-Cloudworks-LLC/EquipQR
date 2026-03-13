
import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface MemberLimitWarningProps {
  onUpgrade: () => void;
}

const MemberLimitWarning: React.FC<MemberLimitWarningProps> = ({ onUpgrade }) => {
  return (
    <div className="p-3 sm:p-4 bg-warning/10 border border-warning/30 rounded-lg">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-warning flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-xs sm:text-sm text-warning">
            You've reached the member limit for the free plan.
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="bg-warning/20 border-warning/40 text-warning hover:bg-warning/30 w-full sm:w-auto text-xs sm:text-sm" 
          onClick={onUpgrade}
        >
          Upgrade to Premium
        </Button>
      </div>
    </div>
  );
};

export default MemberLimitWarning;


