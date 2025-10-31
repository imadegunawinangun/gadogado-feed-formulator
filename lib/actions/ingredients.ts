// Ingredient CRUD operations
import { eq, ilike, and, asc, desc, count, sql } from 'drizzle-orm';
import { db } from '@/db';
import { ingredients, ingredientNutrients, nutrients } from '@/db/schema';
import {
    ActionResult,
    PaginatedResult,
    SearchFilters,
    SortOptions,
    paginationSchema,
    searchSchema,
    idSchema,
    createSuccessResponse,
    createErrorResponse,
    handleDatabaseError,
    validateInput,
    calculatePagination,
    createLikePattern
} from './common';
import {
    insertIngredientSchema,
    selectIngredientSchema,
    type InsertIngredient,
    type Ingredient
} from '@/db/schema/ingredients';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

/**
 * Schema for creating a new ingredient
 */
const createIngredientSchema = insertIngredientSchema.extend({
    nutritionalData: z.array(z.object({
        nutrientId: z.string().uuid(),
        value: z.number(),
        valueAsFed: z.number().optional(),
        valueDryMatter: z.number().optional(),
        confidenceLevel: z.number().int().min(1).max(5).default(1),
        dataSource: z.string().optional(),
    })).optional()
});

/**
 * Schema for updating an ingredient
 */
const updateIngredientSchema = createIngredientSchema.partial();

/**
 * Schema for ingredient filters
 */
const ingredientFiltersSchema = z.object({
    category: z.string().optional(),
    supplier: z.string().optional(),
    isAvailable: z.boolean().optional(),
    minCost: z.number().optional(),
    maxCost: z.number().optional(),
    isOrganic: z.boolean().optional(),
    isHalal: z.boolean().optional(),
});

/**
 * Get paginated ingredients with search and filtering
 */
export async function getIngredients(
    filters: SearchFilters & { category?: string; supplier?: string; isAvailable?: boolean } = {},
    pagination: { page?: number; limit?: number } = {},
    sort: SortOptions = { field: 'name', direction: 'asc' }
): Promise<ActionResult<PaginatedResult<Ingredient>>> {
    try {
        // Validate inputs
        const validatedPagination = paginationSchema.parse(pagination);
        const validatedFilters = searchSchema.merge(ingredientFiltersSchema).parse(filters);
        const validatedSort = z.object({
            field: z.enum(['name', 'category', 'costPerUnit', 'supplier', 'createdAt']),
            direction: z.enum(['asc', 'desc'])
        }).parse(sort);

        const { page, limit } = validatedPagination;
        const offset = (page - 1) * limit;

        // Build query conditions
        const conditions = [];

        if (validatedFilters.search) {
            conditions.push(
                ilike(ingredients.name, createLikePattern(validatedFilters.search))
            );
        }

        if (validatedFilters.category) {
            conditions.push(eq(ingredients.category, validatedFilters.category));
        }

        if (validatedFilters.supplier) {
            conditions.push(eq(ingredients.supplier, validatedFilters.supplier));
        }

        if (validatedFilters.isAvailable !== undefined) {
            conditions.push(eq(ingredients.isAvailable, validatedFilters.isAvailable));
        }

        if (validatedFilters.isOrganic !== undefined) {
            conditions.push(eq(ingredients.isOrganic, validatedFilters.isOrganic));
        }

        if (validatedFilters.isHalal !== undefined) {
            conditions.push(eq(ingredients.isHalal, validatedFilters.isHalal));
        }

        // Build order by
        const orderBy = validatedSort.direction === 'asc'
            ? asc(ingredients[validatedSort.field as keyof typeof ingredients])
            : desc(ingredients[validatedSort.field as keyof typeof ingredients]);

        // Get total count
        const totalCountResult = await db
            .select({ count: count() })
            .from(ingredients)
            .where(conditions.length > 0 ? and(...conditions) : undefined);

        const total = totalCountResult[0]?.count || 0;

        // Get paginated data
        const data = await db
            .select()
            .from(ingredients)
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(orderBy)
            .limit(limit)
            .offset(offset);

        const paginationMeta = calculatePagination(page, limit, total);

        return createSuccessResponse({
            data,
            pagination: paginationMeta
        });

    } catch (error) {
        console.error('Error getting ingredients:', error);
        return handleDatabaseError(error);
    }
}

/**
 * Get a single ingredient by ID
 */
export async function getIngredientById(id: string): Promise<ActionResult<Ingredient>> {
    try {
        const validatedId = idSchema.parse(id);

        const ingredient = await db
            .select()
            .from(ingredients)
            .where(eq(ingredients.id, validatedId))
            .limit(1);

        if (ingredient.length === 0) {
            return createErrorResponse('Ingredient not found', 'The requested ingredient does not exist');
        }

        return createSuccessResponse(ingredient[0]);

    } catch (error) {
        console.error('Error getting ingredient:', error);
        return handleDatabaseError(error);
    }
}

/**
 * Get ingredient with nutritional data
 */
export async function getIngredientWithNutrients(id: string): Promise<ActionResult<Ingredient & { nutrients: any[] }>> {
    try {
        const validatedId = idSchema.parse(id);

        const ingredient = await db
            .select()
            .from(ingredients)
            .where(eq(ingredients.id, validatedId))
            .limit(1);

        if (ingredient.length === 0) {
            return createErrorResponse('Ingredient not found', 'The requested ingredient does not exist');
        }

        const nutritionalData = await db
            .select({
                nutrientId: ingredientNutrients.nutrientId,
                nutrientName: nutrients.name,
                nutrientDisplayName: nutrients.displayName,
                nutrientUnit: nutrients.unit,
                nutrientCategory: nutrients.category,
                value: ingredientNutrients.value,
                valueAsFed: ingredientNutrients.valueAsFed,
                valueDryMatter: ingredientNutrients.valueDryMatter,
                confidenceLevel: ingredientNutrients.confidenceLevel,
                dataSource: ingredientNutrients.dataSource,
                bioavailabilityFactor: ingredientNutrients.bioavailabilityFactor,
            })
            .from(ingredientNutrients)
            .leftJoin(nutrients, eq(ingredientNutrients.nutrientId, nutrients.id))
            .where(eq(ingredientNutrients.ingredientId, validatedId));

        return createSuccessResponse({
            ...ingredient[0],
            nutrients: nutritionalData
        });

    } catch (error) {
        console.error('Error getting ingredient with nutrients:', error);
        return handleDatabaseError(error);
    }
}

/**
 * Create a new ingredient
 */
export async function createIngredient(data: InsertIngredient & { nutritionalData?: any[] }): Promise<ActionResult<Ingredient>> {
    try {
        // Validate input
        const validatedData = validateInput(createIngredientSchema, data);
        if (!validatedData.success) {
            return {
                success: false,
                error: 'Validation failed',
                validationErrors: validatedData.errors
            };
        }

        const { nutritionalData, ...ingredientData } = validatedData.data;

        // Check for duplicate name
        const existingIngredient = await db
            .select({ id: ingredients.id })
            .from(ingredients)
            .where(eq(ingredients.name, ingredientData.name))
            .limit(1);

        if (existingIngredient.length > 0) {
            return createErrorResponse(
                'Duplicate ingredient name',
                'An ingredient with this name already exists'
            );
        }

        // Start transaction
        const result = await db.transaction(async (tx) => {
            // Insert ingredient
            const [newIngredient] = await tx
                .insert(ingredients)
                .values(ingredientData)
                .returning();

            // Insert nutritional data if provided
            if (nutritionalData && nutritionalData.length > 0) {
                await tx
                    .insert(ingredientNutrients)
                    .values(
                        nutritionalData.map(nutrient => ({
                            ingredientId: newIngredient.id,
                            nutrientId: nutrient.nutrientId,
                            value: nutrient.value,
                            valueAsFed: nutrient.valueAsFed,
                            valueDryMatter: nutrient.valueDryMatter,
                            confidenceLevel: nutrient.confidenceLevel || 1,
                            dataSource: nutrient.dataSource,
                        }))
                    );
            }

            return newIngredient;
        });

        // Revalidate cache
        revalidatePath('/dashboard/ingredients');

        return createSuccessResponse(
            result,
            'Ingredient created successfully'
        );

    } catch (error) {
        console.error('Error creating ingredient:', error);
        return handleDatabaseError(error);
    }
}

/**
 * Update an existing ingredient
 */
export async function updateIngredient(
    id: string,
    data: Partial<InsertIngredient> & { nutritionalData?: any[] }
): Promise<ActionResult<Ingredient>> {
    try {
        const validatedId = idSchema.parse(id);
        const validatedData = validateInput(updateIngredientSchema, data);

        if (!validatedData.success) {
            return {
                success: false,
                error: 'Validation failed',
                validationErrors: validatedData.errors
            };
        }

        const { nutritionalData, ...ingredientData } = validatedData.data;

        // Check if ingredient exists
        const existingIngredient = await db
            .select({ id: ingredients.id })
            .from(ingredients)
            .where(eq(ingredients.id, validatedId))
            .limit(1);

        if (existingIngredient.length === 0) {
            return createErrorResponse('Ingredient not found', 'The requested ingredient does not exist');
        }

        // Check for duplicate name (if name is being updated)
        if (ingredientData.name) {
            const duplicateCheck = await db
                .select({ id: ingredients.id })
                .from(ingredients)
                .where(and(
                    eq(ingredients.name, ingredientData.name),
                    sql`${ingredients.id} != ${validatedId}`
                ))
                .limit(1);

            if (duplicateCheck.length > 0) {
                return createErrorResponse(
                    'Duplicate ingredient name',
                    'An ingredient with this name already exists'
                );
            }
        }

        // Start transaction
        const result = await db.transaction(async (tx) => {
            // Update ingredient
            const [updatedIngredient] = await tx
                .update(ingredients)
                .set({
                    ...ingredientData,
                    updatedAt: new Date(),
                })
                .where(eq(ingredients.id, validatedId))
                .returning();

            // Update nutritional data if provided
            if (nutritionalData !== undefined) {
                // Remove existing nutritional data
                await tx
                    .delete(ingredientNutrients)
                    .where(eq(ingredientNutrients.ingredientId, validatedId));

                // Insert new nutritional data
                if (nutritionalData.length > 0) {
                    await tx
                        .insert(ingredientNutrients)
                        .values(
                            nutritionalData.map(nutrient => ({
                                ingredientId: validatedId,
                                nutrientId: nutrient.nutrientId,
                                value: nutrient.value,
                                valueAsFed: nutrient.valueAsFed,
                                valueDryMatter: nutrient.valueDryMatter,
                                confidenceLevel: nutrient.confidenceLevel || 1,
                                dataSource: nutrient.dataSource,
                            }))
                        );
                }
            }

            return updatedIngredient;
        });

        // Revalidate cache
        revalidatePath('/dashboard/ingredients');
        revalidatePath(`/dashboard/ingredients/${id}`);

        return createSuccessResponse(
            result,
            'Ingredient updated successfully'
        );

    } catch (error) {
        console.error('Error updating ingredient:', error);
        return handleDatabaseError(error);
    }
}

/**
 * Delete an ingredient
 */
export async function deleteIngredient(id: string): Promise<ActionResult> {
    try {
        const validatedId = idSchema.parse(id);

        // Check if ingredient exists
        const existingIngredient = await db
            .select({ name: ingredients.name })
            .from(ingredients)
            .where(eq(ingredients.id, validatedId))
            .limit(1);

        if (existingIngredient.length === 0) {
            return createErrorResponse('Ingredient not found', 'The requested ingredient does not exist');
        }

        // Check if ingredient is used in any formulations
        // Note: This check would need the formulation_ingredients table
        // For now, we'll allow deletion and handle cascade constraints

        // Delete ingredient (cascade will handle related records)
        await db.delete(ingredients).where(eq(ingredients.id, validatedId));

        // Revalidate cache
        revalidatePath('/dashboard/ingredients');

        return createSuccessResponse(
            null,
            `Ingredient "${existingIngredient[0].name}" deleted successfully`
        );

    } catch (error) {
        console.error('Error deleting ingredient:', error);
        return handleDatabaseError(error);
    }
}

/**
 * Get unique categories for filtering
 */
export async function getIngredientCategories(): Promise<ActionResult<string[]>> {
    try {
        const categories = await db
            .selectDistinct({ category: ingredients.category })
            .from(ingredients)
            .where(eq(ingredients.isAvailable, true))
            .orderBy(asc(ingredients.category));

        const result = categories
            .map(c => c.category)
            .filter(Boolean); // Remove null values

        return createSuccessResponse(result);

    } catch (error) {
        console.error('Error getting ingredient categories:', error);
        return handleDatabaseError(error);
    }
}

/**
 * Get unique suppliers for filtering
 */
export async function getIngredientSuppliers(): Promise<ActionResult<string[]>> {
    try {
        const suppliers = await db
            .selectDistinct({ supplier: ingredients.supplier })
            .from(ingredients)
            .where(eq(ingredients.isAvailable, true))
            .orderBy(asc(ingredients.supplier));

        const result = suppliers
            .map(s => s.supplier)
            .filter(Boolean); // Remove null values

        return createSuccessResponse(result);

    } catch (error) {
        console.error('Error getting ingredient suppliers:', error);
        return handleDatabaseError(error);
    }
}