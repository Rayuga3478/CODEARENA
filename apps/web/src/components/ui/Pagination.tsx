import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from './Button';

function pageList(page: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const set = new Set([1, total, page - 1, page, page + 1]);
  const pages = [...set].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: (number | '…')[] = [];
  pages.forEach((p, i) => {
    if (i > 0 && p - pages[i - 1]! > 1) out.push('…');
    out.push(p);
  });
  return out;
}

export function Pagination({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav className="flex flex-wrap items-center justify-center gap-1" aria-label="Pagination">
      <Button size="sm" icon onClick={() => onChange(1)} disabled={page <= 1} aria-label="First page" className="hidden sm:inline-flex">
        <ChevronsLeft size={14} />
      </Button>
      <Button size="sm" icon onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Previous page">
        <ChevronLeft size={14} />
      </Button>
      {pageList(page, totalPages).map((p, i) =>
        p === '…' ? (
          <span key={`e${i}`} className="px-1 t-ui t-muted">…</span>
        ) : (
          <Button key={p} size="sm" pressed={p === page} onClick={() => onChange(p)} aria-label={`Page ${p}`} className="min-w-[32px]">
            <span className="t-mono">{p}</span>
          </Button>
        ),
      )}
      <Button size="sm" icon onClick={() => onChange(page + 1)} disabled={page >= totalPages} aria-label="Next page">
        <ChevronRight size={14} />
      </Button>
      <Button size="sm" icon onClick={() => onChange(totalPages)} disabled={page >= totalPages} aria-label="Last page" className="hidden sm:inline-flex">
        <ChevronsRight size={14} />
      </Button>
    </nav>
  );
}
