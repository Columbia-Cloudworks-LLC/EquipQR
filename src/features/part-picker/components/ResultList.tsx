import type { PartCardDto } from '@/features/part-picker/types/parts';
import PartCard from './PartCard';

interface ResultListProps {
  results: PartCardDto[];
  onSelect: (id: string) => void;
}

export default function ResultList({ results, onSelect }: ResultListProps) {
  const top = results.slice(0, 8);
  if (top.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        No results. Try removing dashes, or search by brand only.
      </div>
    );
  }
  return (
    <div id="part-results" role="listbox" className="grid gap-3">
      {top.map((r) => (
        <div role="option" key={r.id} onClick={() => onSelect(r.id)}>
          <PartCard part={r} />
        </div>
      ))}
    </div>
  );
}
