import type { ApiSuccessResponse, PaginatedData, PaginatedResponse } from '@cp/shared';

/**
 * Wraps data in the standard API success response format.
 */
export function successResponse<T>(data: T): ApiSuccessResponse<T> {
  return {
    success: true,
    data,
  };
}

/**
 * Wraps paginated data in the standard API response format.
 */
export function paginatedResponse<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
): PaginatedResponse<T> {
  const paginatedData: PaginatedData<T> = {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
  return {
    success: true,
    data: paginatedData,
  };
}
