export interface PaginationControlProps {
  currentPage: number
  totalItems: number
  pageSize: number
  pageSizeOptions?: number[]
  showPageSize?: boolean
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  className?: string
}
