import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

type BulkEditBackButtonProps = {
  to: string;
};

export const BulkEditBackButton: React.FC<BulkEditBackButtonProps> = ({ to }) => (
  <Button asChild variant="outline">
    <Link to={to}>
      <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
      Done
    </Link>
  </Button>
);
