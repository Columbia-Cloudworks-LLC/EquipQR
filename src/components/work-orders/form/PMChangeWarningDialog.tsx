import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, FileDown, Wrench } from "lucide-react";

interface PMChangeWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
  changeType: 'disable' | 'change_template';
  hasExistingNotes?: boolean;
  hasCompletedItems?: boolean;
}

export const PMChangeWarningDialog: React.FC<PMChangeWarningDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  changeType,
  hasExistingNotes = false,
  hasCompletedItems = false,
}) => {
  const isDisabling = changeType === 'disable';
  
  const title = isDisabling 
    ? "Disable Preventative Maintenance?" 
    : "Change PM Checklist Template?";
  
  const description = isDisabling
    ? "This work order has an existing PM checklist with data that will become inaccessible."
    : "Changing the PM template will replace the existing checklist. All current PM data will be lost.";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>{description}</p>
            
            {(hasExistingNotes || hasCompletedItems) && (
              <Alert variant="destructive" className="mt-3">
                <Wrench className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>Warning:</strong> This PM checklist contains:
                  <ul className="list-disc ml-4 mt-1">
                    {hasCompletedItems && <li>Completed inspection items</li>}
                    {hasExistingNotes && <li>Technician notes and observations</li>}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mt-3">
              <div className="flex items-start gap-2">
                <FileDown className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Recommendation:</strong> Before proceeding, go to the work order details page and download the PM checklist PDF to preserve any critical notes or inspection data.
                </div>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            className="bg-destructive hover:bg-destructive/90"
          >
            Yes, {isDisabling ? "Disable PM" : "Change Template"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

