import { Button } from "@/components/ui/button"

export default function Pagination({ currentPage, totalPages, onPageChange }) {
  const getPageNumbers = () => {
    const pages = []
    const pagesPerGroup = 5
    const currentGroup = Math.floor((currentPage - 1) / pagesPerGroup)
    const startPage = currentGroup * pagesPerGroup + 1
    const endPage = Math.min(startPage + pagesPerGroup - 1, totalPages)
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i)
    }
    
    return pages
  }

  return (
    <div className="flex items-center justify-center">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="bg-transparent dark:text-white dark:hover:bg-slate-700"
        >
          {'<'}
        </Button>
        <div className="flex items-center gap-1">
          {getPageNumbers().map((page) => (
            <Button
              key={page}
              variant={page === currentPage ? "default" : "outline"}
              size="sm"
              onClick={() => onPageChange(page)}
              className={page === currentPage ? "bg-blue-600 hover:bg-blue-700 text-white dark:bg-green-600 dark:hover:bg-green-700" : "bg-transparent dark:text-white dark:hover:bg-slate-700"}
            >
              {page}
            </Button>
          ))}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="bg-transparent dark:text-white dark:hover:bg-slate-700"
        >
          {'>'}
        </Button>
      </div>
    </div>
  )
}
