import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface NotesLoadingSkeletonProps {
  cardClassName?: string;
}

const NotesLoadingSkeleton: React.FC<NotesLoadingSkeletonProps> = ({
  cardClassName,
}) => (
  <Card className={cardClassName}>
    <CardContent className="p-6">
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded" />
        ))}
      </div>
    </CardContent>
  </Card>
);

export default NotesLoadingSkeleton;
