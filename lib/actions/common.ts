// Common types and utilities for server actions
import { z } from 'zod';

/**
 * Standardized result type for server actions
 */
export interface ActionResult<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
    validationErrors?: Record<string, string[]>;
}

/**
 * Paginated result type
 */
export interface PaginatedResult<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}

/**
 * Search and filter options
 */
export interface SearchFilters {
    search?: string;
    category?: string;
    status?: string;
    dateFrom?: Date;
    dateTo?: Date;
    [key: string]: any;
}

/**
 * Sort options
 */
export interface SortOptions {
    field: string;
    direction: 'asc' | 'desc';
}

/**
 * Standardized validation error helper
 */
export function createValidationError(
    errors: Record<string, string[]>
): ActionResult {
    return {
        success: false,
        error: 'Validation failed',
        validationErrors: errors
    };
}

/**
 * Standardized success response
 */
export function createSuccessResponse<T>(
    data: T,
    message?: string
): ActionResult<T> {
    return {
        success: true,
        data,
        message
    };
}

/**
 * Standardized error response
 */
export function createErrorResponse(
    error: string,
    message?: string
): ActionResult {
    return {
        success: false,
        error,
        message
    };
}

/**
 * Common Zod validation schema for pagination
 */
export const paginationSchema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
});

/**
 * Common Zod validation schema for search
 */
export const searchSchema = z.object({
    search: z.string().optional(),
    category: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Common Zod validation schema for ID
 */
export const idSchema = z.string().uuid({
    message: 'Invalid ID format'
});

/**
 * Calculate pagination metadata
 */
export function calculatePagination(
    page: number,
    limit: number,
    total: number
) {
    const totalPages = Math.ceil(total / limit);

    return {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
    };
}

/**
 * Create SQL LIKE pattern for search
 */
export function createLikePattern(search: string): string {
    return `%${search}%`;
}

/**
 * Handle database errors consistently
 */
export function handleDatabaseError(error: any): ActionResult {
    console.error('Database error:', error);

    // Handle specific database errors
    if (error.code === '23505') {
        return {
            success: false,
            error: 'Duplicate entry',
            message: 'This record already exists'
        };
    }

    if (error.code === '23503') {
        return {
            success: false,
            error: 'Foreign key constraint violation',
            message: 'Referenced record does not exist'
        };
    }

    if (error.code === '23502') {
        return {
            success: false,
            error: 'Missing required field',
            message: 'Please fill in all required fields'
        };
    }

    // Generic error
    return {
        success: false,
        error: 'Database operation failed',
        message: 'An unexpected error occurred. Please try again.'
    };
}

/**
 * Validate and sanitize input
 */
export function validateInput<T>(
    schema: z.ZodSchema<T>,
    data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string[]> } {
    const result = schema.safeParse(data);

    if (result.success) {
        return { success: true, data: result.data };
    }

    const errors: Record<string, string[]> = {};
    result.error.issues.forEach((issue) => {
        const field = issue.path.join('.');
        if (!errors[field]) {
            errors[field] = [];
        }
        errors[field].push(issue.message);
    });

    return { success: false, errors };
}