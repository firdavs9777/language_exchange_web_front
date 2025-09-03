
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  totalMoments: number;
  isLoading?: boolean;
}
// Modern Pagination Component
const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  hasNextPage,
  hasPrevPage,
  totalMoments,
  isLoading = false,
}) => {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const delta = 2;
    const range = [];
    const rangeWithDots = [];

    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(totalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots;
  };

  return (
    <div className="mt-8 px-4 sm:px-6">
      <div className="overflow-hidden rounded-2xl bg-white/60 backdrop-blur-xl border border-white/30 shadow-xl">
        <div className="px-6 py-4">
          {/* Moments count */}
          <div className="text-center mb-4">
            <p className="text-sm text-gray-600">
              Showing page {currentPage} of {totalPages} ({totalMoments} total moments)
            </p>
          </div>

          {/* Pagination buttons */}
          <div className="flex items-center justify-center gap-2">
            {/* Previous button */}
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={!hasPrevPage || isLoading}
              className="group flex items-center gap-2 rounded-full bg-white/60 backdrop-blur-sm border border-white/30 px-4 py-2 text-sm font-medium text-gray-700 shadow-lg transition-all duration-300 hover:bg-white/80 hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
            >
              <FaChevronLeft className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" />
              <span className="hidden sm:inline">Previous</span>
            </button>

            {/* Page numbers */}
            <div className="flex items-center gap-1">
              {getPageNumbers().map((pageNum, index) => {
                if (pageNum === '...') {
                  return (
                    <span
                      key={`dots-${index}`}
                      className="px-3 py-2 text-sm text-gray-400"
                    >
                      ...
                    </span>
                  );
                }

                const isCurrentPage = pageNum === currentPage;
                return (
                  <button
                    key={pageNum}
                    onClick={() => onPageChange(pageNum as number)}
                    disabled={isLoading}
                    className={`h-10 w-10 rounded-full text-sm font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-400/50 ${
                      isCurrentPage
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transform scale-110'
                        : 'bg-white/60 backdrop-blur-sm border border-white/30 text-gray-700 shadow-lg hover:bg-white/80 hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            {/* Next button */}
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={!hasNextPage || isLoading}
              className="group flex items-center gap-2 rounded-full bg-white/60 backdrop-blur-sm border border-white/30 px-4 py-2 text-sm font-medium text-gray-700 shadow-lg transition-all duration-300 hover:bg-white/80 hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
            >
              <span className="hidden sm:inline">Next</span>
              <FaChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Pagination;
