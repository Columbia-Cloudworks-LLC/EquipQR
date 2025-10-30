import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  MessageSquare, 
  Camera,
  Lock
} from 'lucide-react';

interface WorkOrderNotesMobileProps {
  workOrderId: string;
  canAddNotes: boolean;
  showPrivateNotes: boolean;
  onAddNote?: (note: { content: string; hours: number; isPrivate: boolean; images?: File[] }) => void;
}

export const WorkOrderNotesMobile: React.FC<WorkOrderNotesMobileProps> = ({
  workOrderId,
  canAddNotes,
  showPrivateNotes,
  onAddNote
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [hoursWorked, setHoursWorked] = useState(0);
  const [isPrivate, setIsPrivate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!noteContent.trim() && hoursWorked === 0) return;
    
    setIsSubmitting(true);
    try {
      if (onAddNote) {
        await onAddNote({
          content: noteContent,
          hours: hoursWorked,
          isPrivate
        });
      }
      setNoteContent('');
      setHoursWorked(0);
      setIsPrivate(false);
    } catch (error) {
      console.error('Error adding note:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Notes & Updates
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Add Note Form - Collapsible */}
        {canAddNotes && (
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  <span>Add Note</span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="mt-4 space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium mb-2 block">Note Content</label>
                  <Textarea
                    placeholder="Enter your note..."
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Hours Worked</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.5"
                      value={hoursWorked}
                      onChange={(e) => setHoursWorked(Number(e.target.value))}
                      placeholder="0"
                    />
                  </div>
                  
                  {showPrivateNotes && (
                    <div className="flex items-center space-x-2 pt-6">
                      <Switch
                        id="private-note"
                        checked={isPrivate}
                        onCheckedChange={setIsPrivate}
                      />
                      <label htmlFor="private-note" className="text-sm font-medium">
                        Private Note
                      </label>
                    </div>
                  )}
                </div>
                
                {isPrivate && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-yellow-50 p-2 rounded">
                    <Lock className="h-4 w-4" />
                    <span>Only you can see private notes</span>
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Button 
                    onClick={handleSubmit}
                    disabled={isSubmitting || (!noteContent.trim() && hoursWorked === 0)}
                    className="flex-1"
                  >
                    {isSubmitting ? 'Adding...' : 'Add Note'}
                  </Button>
                  
                  <Button 
                    variant="outline"
                    onClick={() => {
                      // TODO: Implement image upload
                      console.log('Upload image');
                    }}
                    className="px-3"
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Notes List - Placeholder */}
        <div className="space-y-3">
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No notes yet</p>
            <p className="text-xs">Start by adding your first note or update</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
