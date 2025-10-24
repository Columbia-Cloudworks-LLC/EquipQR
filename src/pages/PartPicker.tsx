import { useState, useMemo } from 'react';
import SearchBar from '@/components/part-picker/SearchBar';
import ResultList from '@/components/part-picker/ResultList';
import PartDetail from '@/components/part-picker/PartDetail';
import { usePartSearch } from '@/hooks/usePartSearch';
import { usePartDetail } from '@/hooks/usePartDetail';
import { Skeleton } from '@/components/ui/skeleton';

export default function PartPicker() {
  const [q, setQ] = useState('');
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);

  const { data, isFetching } = usePartSearch({ q, limit: 8 });
  const { data: detail, isFetching: loadingDetail } = usePartDetail(selectedId);

  const results = useMemo(() => data?.results ?? [], [data]);

  return (
    <div className="p-content">
      <div className="sticky top-0 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-4 z-10">
        <h1 className="text-2xl font-semibold mb-3">Part Picker</h1>
        <SearchBar
          value={q}
          onChange={setQ}
          onSubmitTop={() => {
            if (results[0]) setSelectedId(results[0].id);
          }}
        />
      </div>

      <div className="grid gap-4 mt-4">
        {isFetching ? (
          <div className="grid gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : (
          <ResultList results={results} onSelect={setSelectedId} />
        )}

        {selectedId && (
          loadingDetail ? (
            <Skeleton className="h-40 w-full" />
          ) : detail ? (
            <PartDetail data={detail} />
          ) : null
        )}
      </div>
    </div>
  );
}
