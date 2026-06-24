"use client";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

type PageItem = number | "ellipsis";

// Always anchors the first and last page; shows up to 5 consecutive page
// numbers around the current page, collapsing the gap into an ellipsis once
// there are more than 7 pages total.
function getPageItems(current: number, total: number): PageItem[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  let start = Math.max(2, current - 2);
  let end = Math.min(total - 1, current + 2);

  if (current <= 4) {
    start = 2;
    end = 6;
  } else if (current >= total - 3) {
    start = total - 5;
    end = total - 1;
  }

  const items: PageItem[] = [1];
  if (start > 2) items.push("ellipsis");
  for (let page = start; page <= end; page++) items.push(page);
  if (end < total - 1) items.push("ellipsis");
  items.push(total);

  return items;
}

const PILL_CLASSES = "flex h-9 w-9 items-center justify-center rounded-full text-sm transition-colors";
const ACTIVE_CLASSES = "bg-gv-gold text-gv-bg font-bold";
const INACTIVE_CLASSES =
  "border border-gv-gold/40 text-gv-muted hover:border-gv-gold hover:text-gv-gold";

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const items = getPageItems(currentPage, totalPages);

  return (
    <div className="flex items-center justify-center gap-2 py-8">
      {/* Prev */}
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Previous page"
        className={`${PILL_CLASSES} ${INACTIVE_CLASSES} disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-gv-gold/40 disabled:hover:text-gv-muted`}
      >
        ←
      </button>

      {/* Page numbers */}
      {items.map((item, index) =>
        item === "ellipsis" ? (
          <span
            key={`ellipsis-${index}`}
            aria-hidden
            className="flex h-9 w-9 items-center justify-center text-sm text-gv-muted"
          >
            ...
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onPageChange(item)}
            aria-current={item === currentPage ? "page" : undefined}
            className={`${PILL_CLASSES} ${item === currentPage ? ACTIVE_CLASSES : INACTIVE_CLASSES}`}
          >
            {item}
          </button>
        ),
      )}

      {/* Next */}
      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Next page"
        className={`${PILL_CLASSES} ${INACTIVE_CLASSES} disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-gv-gold/40 disabled:hover:text-gv-muted`}
      >
        →
      </button>
    </div>
  );
}
