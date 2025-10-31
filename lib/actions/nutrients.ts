// Nutrients CRUD operations
import { eq, ilike, and, asc, desc, count } from 'drizzle-orm';
import { db } from '@/db';
import { nutrients } from '@/db/schema';
import {
    ActionResult,
    PaginatedResult,
    createSuccessResponse,
    createErrorResponse,
    handleDatabaseError,
    validateInput,
    calculatePagination,
    createLikePattern,
    paginationSchema,
    searchSchema,
    idSchema
} from './common';
import {
    insertNutrientSchema,
    type InsertNutrient,
    type Nutrient
} from '@/db/schema/nutrients';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

/**
 * Schema for nutrient filters
 */
const nutrientFiltersSchema = z.object({
    category: z.string().optional(),
    subcategory: z.string().optional(),
    unitType: z.string().optional(),
    isVisible: z.boolean().optional(),
    isRequired: z.boolean().optional(),
});

/**
 * Get paginated nutrients with search and filtering
 */
export async function getNutrients(
    filters: any = {},
    pagination: { page?: number; limit?: number } = {},
    sort: { field?: string; direction?: 'asc' | 'desc' } = { field: 'displayOrder', direction: 'asc' }
): Promise<ActionResult<PaginatedResult<Nutrient>>> {
    try {
        const validatedPagination = paginationSchema.parse(pagination);
        const validatedFilters = searchSchema.merge(nutrientFiltersSchema).parse(filters);
        const validatedSort = z.object({
            field: z.enum(['displayName', 'category', 'displayOrder', 'unit']),
            direction: z.enum(['asc', 'desc'])
        }).parse(sort);

        const { page, limit } = validatedPagination;
        const offset = (page - 1) * limit;

        // Build conditions
        const conditions = [];

        if (validatedFilters.search) {
            conditions.push(
                ilike(nutrients.displayName, createLikePattern(validatedFilters.search))
            );
        }

        if (validatedFilters.category) {
            conditions.push(eq(nutrients.category, validatedFilters.category));
        }

        if (validatedFilters.subcategory) {
            conditions.push(eq(nutrients.subcategory, validatedFilters.subcategory));
        }

        if (validatedFilters.unitType) {
            conditions.push(eq(nutrients.unitType, validatedFilters.unitType));
        }

        if (validatedFilters.isVisible !== undefined) {
            conditions.push(eq(nutrients.isVisible, validatedFilters.isVisible));
        }

        if (validatedFilters.isRequired !== undefined) {
            conditions.push(eq(nutrients.isRequired, validatedFilters.isRequired));
        }

        // Order by
        const orderBy = validatedSort.direction === 'asc'
            ? asc(nutrients[validatedSort.field as keyof typeof nutrients])
            : desc(nutrients[validatedSort.field as keyof typeof nutrients]);

        // Get total count
        const totalCountResult = await db
            .select({ count: count() })
            .from(nutrients)
            .where(conditions.length > 0 ? and(...conditions) : undefined);

        const total = totalCountResult[0]?.count || 0;

        // Get paginated data
        const data = await db
            .select()
            .from(nutrients)
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(orderBy)
            .limit(limit)
            .offset(offset);

        return createSuccessResponse({
            data,
            pagination: calculatePagination(page, limit, total)
        });

    } catch (error) {
        console.error('Error getting nutrients:', error);
        return handleDatabaseError(error);
    }
}

/**
 * Get all visible nutrients (for forms and dropdowns)
 */
export async function getVisibleNutrients(): Promise<ActionResult<Nutrient[]>> {
    try {
        const nutrientsList = await db
            .select()
            .from(nutrients)
            .where(eq(nutrients.isVisible, true))
            .orderBy(asc(nutrients.displayOrder));

        return createSuccessResponse(nutrientsList);

    } catch (error) {
        console.error('Error getting visible nutrients:', error);
        return handleDatabaseError(error);
    }
}

/**
 * Get nutrients by category
 */
export async function getNutrientsByCategory(category: string): Promise<ActionResult<Nutrient[]>> {
    try {
        const nutrientsList = await db
            .select()
            .from(nutrients)
            .where(and(
                eq(nutrients.category, category),
                eq(nutrients.isVisible, true)
            ))
            .orderBy(asc(nutrients.displayOrder));

        return createSuccessResponse(nutrientsList);

    } catch (error) {
        console.error('Error getting nutrients by category:', error);
        return handleDatabaseError(error);
    }
}

/**
 * Get a single nutrient by ID
 */
export async function getNutrientById(id: string): Promise<ActionResult<Nutrient>> {
    try {
        const validatedId = idSchema.parse(id);

        const nutrient = await db
            .select()
            .from(nutrients)
            .where(eq(nutrients.id, validatedId))
            .limit(1);

        if (nutrient.length === 0) {
            return createErrorResponse('Nutrient not found');
        }

        return createSuccessResponse(nutrient[0]);

    } catch (error) {
        console.error('Error getting nutrient:', error);
        return handleDatabaseError(error);
    }
}

/**
 * Create a new nutrient
 */
export async function createNutrient(data: InsertNutrient): Promise<ActionResult<Nutrient>> {
    try {
        const validatedData = validateInput(insertNutrientSchema, data);
        if (!validatedData.success) {
            return {
                success: false,
                error: 'Validation failed',
                validationErrors: validatedData.errors
            };
        }

        // Check for duplicate name
        const existingNutrient = await db
            .select({ id: nutrients.id })
            .from(nutrients)
            .where(eq(nutrients.name, validatedData.data.name))
            .limit(1);

        if (existingNutrient.length > 0) {
            return createErrorResponse(
                'Duplicate nutrient name',
                'A nutrient with this name already exists'
            );
        }

        const [newNutrient] = await db
            .insert(nutrients)
            .values(validatedData.data)
            .returning();

        revalidatePath('/dashboard/nutrients');

        return createSuccessResponse(newNutrient, 'Nutrient created successfully');

    } catch (error) {
        console.error('Error creating nutrient:', error);
        return handleDatabaseError(error);
    }
}

/**
 * Update an existing nutrient
 */
export async function updateNutrient(id: string, data: Partial<InsertNutrient>): Promise<ActionResult<Nutrient>> {
    try {
        const validatedId = idSchema.parse(id);
        const validatedData = validateInput(insertNutrientSchema.partial(), data);

        if (!validatedData.success) {
            return {
                success: false,
                error: 'Validation failed',
                validationErrors: validatedData.errors
            };
        }

        // Check if nutrient exists
        const existingNutrient = await db
            .select({ id: nutrients.id })
            .from(nutrients)
            .where(eq(nutrients.id, validatedId))
            .limit(1);

        if (existingNutrient.length === 0) {
            return createErrorResponse('Nutrient not found');
        }

        // Check for duplicate name (if name is being updated)
        if (validatedData.data.name) {
            const duplicateCheck = await db
                .select({ id: nutrients.id })
                .from(nutrients)
                .where(and(
                    eq(nutrients.name, validatedData.data.name),
                    // @ts-ignore
                    sql`${nutrients.id} != ${validatedId}`
                ))
                .limit(1);

            if (duplicateCheck.length > 0) {
                return createErrorResponse(
                    'Duplicate nutrient name',
                    'A nutrient with this name already exists'
                );
            }
        }

        const [updatedNutrient] = await db
            .update(nutrients)
            .set({
                ...validatedData.data,
                updatedAt: new Date(),
            })
            .where(eq(nutrients.id, validatedId))
            .returning();

        revalidatePath('/dashboard/nutrients');
        revalidatePath(`/dashboard/nutrients/${id}`);

        return createSuccessResponse(updatedNutrient, 'Nutrient updated successfully');

    } catch (error) {
        console.error('Error updating nutrient:', error);
        return handleDatabaseError(error);
    }
}

/**
 * Delete a nutrient
 */
export async function deleteNutrient(id: string): Promise<ActionResult> {
    try {
        const validatedId = idSchema.parse(id);

        // Get nutrient info before deletion
        const nutrientInfo = await db
            .select({ name: nutrients.name })
            .from(nutrients)
            .where(eq(nutrients.id, validatedId))
            .limit(1);

        if (nutrientInfo.length === 0) {
            return createErrorResponse('Nutrient not found');
        }

        // Note: This will fail if the nutrient is referenced by ingredient_nutrients or animal_requirements
        // due to foreign key constraints. This is intentional to prevent accidental deletion of nutrients in use.

        await db.delete(nutrients).where(eq(nutrients.id, validatedId));

        revalidatePath('/dashboard/nutrients');

        return createSuccessResponse(null, `Nutrient "${nutrientInfo[0].name}" deleted successfully`);

    } catch (error) {
        console.error('Error deleting nutrient:', error);

        // Handle foreign key constraint violations
        if (error.code === '23503') {
            return createErrorResponse(
                'Cannot delete nutrient',
                'This nutrient is being used by ingredients or animal requirements. Remove those references first.'
            );
        }

        return handleDatabaseError(error);
    }
}

/**
 * Get nutrient categories for filtering
 */
export async function getNutrientCategories(): Promise<ActionResult<string[]>> {
    try {
        const categories = await db
            .selectDistinct({ category: nutrients.category })
            .from(nutrients)
            .where(eq(nutrients.isVisible, true))
            .orderBy(asc(nutrients.category));

        const result = categories.map(c => c.category).filter(Boolean);

        return createSuccessResponse(result);

    } catch (error) {
        console.error('Error getting nutrient categories:', error);
        return handleDatabaseError(error);
    }
}

/**
 * Get essential nutrients (required for formulations)
 */
export async function getEssentialNutrients(): Promise<ActionResult<Nutrient[]>> {
    try {
        const essentialNutrients = await db
            .select()
            .from(nutrients)
            .where(and(
                eq(nutrients.isRequired, true),
                eq(nutrients.isVisible, true)
            ))
            .orderBy(asc(nutrients.displayOrder));

        return createSuccessResponse(essentialNutrients);

    } catch (error) {
        console.error('Error getting essential nutrients:', error);
        return handleDatabaseError(error);
    }
}

/**
 * Get key nutrients by category (energy, protein, etc.)
 */
export async function getKeyNutrientsByCategory(): Promise<ActionResult<Record<string, Nutrient[]>>> {
    try {
        const allNutrients = await db
            .select()
            .from(nutrients)
            .where(eq(nutrients.isVisible, true))
            .orderBy(asc(nutrients.category), asc(nutrients.displayOrder));

        // Group by category
        const groupedNutrients = allNutrients.reduce((acc, nutrient) => {
            if (!acc[nutrient.category]) {
                acc[nutrient.category] = [];
            }
            acc[nutrient.category].push(nutrient);
            return acc;
        }, {} as Record<string, Nutrient[]>);

        return createSuccessResponse(groupedNutrients);

    } catch (error) {
        console.error('Error getting key nutrients by category:', error);
        return handleDatabaseError(error);
    }
}