import { useEffect, useMemo, useState } from "react";

export const DEFAULT_TABLE_PAGE_SIZE = 50;

export default function useTablePagination(items, resetKey = "") {
  const [pageSizeInput, setPageSizeInput] = useState(
    String(DEFAULT_TABLE_PAGE_SIZE),
  );
  const [pageSize, setPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const parsed = Number.parseInt(String(pageSizeInput || "").trim(), 10);
    if (Number.isInteger(parsed) && parsed > 0) {
      setPageSize(parsed);
      setCurrentPage(1);
    }
  }, [pageSizeInput]);

  useEffect(() => {
    setCurrentPage(1);
  }, [resetKey]);

  const totalItems = Array.isArray(items) ? items.length : 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  useEffect(() => {
    setCurrentPage((prev) => Math.min(prev, totalPages));
  }, [totalPages]);

  const paginatedItems = useMemo(() => {
    if (!Array.isArray(items) || items.length === 0) return [];
    const startIndex = (currentPage - 1) * pageSize;
    return items.slice(startIndex, startIndex + pageSize);
  }, [currentPage, items, pageSize]);

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = totalItems === 0 ? 0 : Math.min(currentPage * pageSize, totalItems);

  const handlePageSizeBlur = () => {
    const parsed = Number.parseInt(String(pageSizeInput || "").trim(), 10);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      setPageSizeInput(String(pageSize));
    }
  };

  return {
    currentPage,
    endItem,
    pageSize,
    pageSizeInput,
    paginatedItems,
    setCurrentPage,
    setPageSizeInput,
    startItem,
    totalItems,
    totalPages,
    handlePageSizeBlur,
  };
}
