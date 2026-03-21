// src/components/admin/SearchBar.tsx
// Clean search input — NO field chips below it (removed as requested).
// Shows result count only when actively filtering.
import { useRef, useEffect, KeyboardEvent } from 'react';
import { Search, X } from 'lucide-react';

interface Props {
  value:        string;
  onChange:     (v: string) => void;
  onClear:      () => void;
  placeholder?: string;
  resultCount:  number;
  totalCount:   number;
  isFiltering:  boolean;
  autoFocus?:   boolean;
}

export function SearchBar({
  value, onChange, onClear,
  placeholder = 'Search…',
  resultCount, totalCount, isFiltering, autoFocus,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') { onClear(); inputRef.current?.blur(); }
  };

  return (
    <div className="relative w-full">
      <Search
        size={15}
        className={`absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors ${
          isFiltering ? 'text-blue-500' : 'text-slate-400'
        }`}
      />

      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKey}
        placeholder={placeholder}
        className={`w-full pl-11 py-3 rounded-xl text-sm border-2 bg-white outline-none transition-all ${
          isFiltering
            ? 'border-blue-400 ring-2 ring-blue-100 pr-24'
            : 'border-slate-200 hover:border-slate-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 pr-10'
        } shadow-sm`}
      />

      {/* Result count badge — shown inside the input on the right */}
      {isFiltering && (
        <span className={`absolute right-9 top-1/2 -translate-y-1/2 text-[11px] font-black px-2 py-0.5 rounded-full ${
          resultCount === 0
            ? 'bg-red-100 text-red-600'
            : 'bg-blue-100 text-blue-600'
        }`}>
          {resultCount === 0 ? 'No results' : `${resultCount}/${totalCount}`}
        </span>
      )}

      {/* Clear button */}
      {value && (
        <button
          onClick={onClear}
          title="Clear (Esc)"
          className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center transition-colors"
        >
          <X size={11} className="text-slate-600" />
        </button>
      )}
    </div>
  );
}