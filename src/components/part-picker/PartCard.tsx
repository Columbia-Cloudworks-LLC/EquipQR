import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { PartCardDto } from '@/types/parts';

export default function PartCard({ part }: { part: PartCardDto }) {
  return (
    <Card className="cursor-pointer">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{part.title}</span>
          <span className="text-sm text-muted-foreground">{part.brand}</span>
        </CardTitle>
        <CardDescription>
          {part.canonical_mpn} • {part.category} • {part.distributor_count} distributors
        </CardDescription>
      </CardHeader>
    </Card>
  );
}
