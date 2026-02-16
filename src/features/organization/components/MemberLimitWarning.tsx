
import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface MemberLimitWarningProps {
  onUpgrade: () => void;
}

const MemberLimitWarning: React.FC<MemberLimitWarningProps> = ({ onUpgrade }) => {
  return (
    <div className="p-3 sm:p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-xs sm:text-sm text-yellow-800">
            You've reached the member limit for the free plan.
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="bg-yellow-100 border-yellow-300 text-yellow-800 hover:bg-yellow-200 w-full sm:w-auto text-xs sm:text-sm" 
          onClick={onUpgrade}
        >
          Upgrade to Premium
        </Button>
      </div>
    </div>
  );
};

export default MemberLimitWarning;

