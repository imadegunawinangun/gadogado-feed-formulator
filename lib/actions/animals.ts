// Animal and Production Stage CRUD operations
import { eq, ilike, and, asc, desc, count, sql } from 'drizzle-orm';
import { db } from '@/db';
import { animals, productionStages, animalRequirements } from '@/db/schema';
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
    insertAnimalSchema,
    type InsertAnimal,
    type Animal
} from '@/db/schema/animals';
import {
    insertProductionStageSchema,
    type InsertProductionStage,
    type ProductionStage
} from '@/db/schema/production-stages';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

/**
 * Animal CRUD Operations
 */

// Schema for animal filters
const animalFiltersSchema = z.object({
    animalType: z.string().optional(),
    primaryPurpose: z.string().optional(),
    isCommon: z.boolean().optional(),
    isActive: z.boolean().optional(),
});

/**
 * Get paginated animals with search and filtering
 */
export async function getAnimals(
    filters: any = {},
    pagination: { page?: number; limit?: number } = {},
    sort: { field?: string; direction?: 'asc' | 'desc' } = { field: 'displayName', direction: 'asc' }
): Promise<ActionResult<PaginatedResult<Animal>>> {
    try {
        const validatedPagination = paginationSchema.parse(pagination);
        const validatedFilters = searchSchema.merge(animalFiltersSchema).parse(filters);
        const validatedSort = z.object({
            field: z.enum(['displayName', 'species', 'breed', 'animalType', 'createdAt']),
            direction: z.enum(['asc', 'desc'])
        }).parse(sort);

        const { page, limit } = validatedPagination;
        const offset = (page - 1) * limit;

        // Build conditions
        const conditions = [];

        if (validatedFilters.search) {
            conditions.push(
                ilike(animals.displayName, createLikePattern(validatedFilters.search))
            );
        }

        if (validatedFilters.animalType) {
            conditions.push(eq(animals.animalType, validatedFilters.animalType));
        }

        if (validatedFilters.primaryPurpose) {
            conditions.push(eq(animals.primaryPurpose, validatedFilters.primaryPurpose));
        }

        if (validatedFilters.isCommon !== undefined) {
            conditions.push(eq(animals.isCommon, validatedFilters.isCommon));
        }

        if (validatedFilters.isActive !== undefined) {
            conditions.push(eq(animals.isActive, validatedFilters.isActive));
        }

        // Order by
        const orderBy = validatedSort.direction === 'asc'
            ? asc(animals[validatedSort.field as keyof typeof animals])
            : desc(animals[validatedSort.field as keyof typeof animals]);

        // Get total count
        const totalCountResult = await db
            .select({ count: count() })
            .from(animals)
            .where(conditions.length > 0 ? and(...conditions) : undefined);

        const total = totalCountResult[0]?.count || 0;

        // Get paginated data
        const data = await db
            .select()
            .from(animals)
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(orderBy)
            .limit(limit)
            .offset(offset);

        return createSuccessResponse({
            data,
            pagination: calculatePagination(page, limit, total)
        });

    } catch (error) {
        console.error('Error getting animals:', error);
        return handleDatabaseError(error);
    }
}

/**
 * Get a single animal by ID
 */
export async function getAnimalById(id: string): Promise<ActionResult<Animal>> {
    try {
        const validatedId = idSchema.parse(id);

        const animal = await db
            .select()
            .from(animals)
            .where(eq(animals.id, validatedId))
            .limit(1);

        if (animal.length === 0) {
            return createErrorResponse('Animal not found');
        }

        return createSuccessResponse(animal[0]);

    } catch (error) {
        console.error('Error getting animal:', error);
        return handleDatabaseError(error);
    }
}

/**
 * Create a new animal
 */
export async function createAnimal(data: InsertAnimal): Promise<ActionResult<Animal>> {
    try {
        const validatedData = validateInput(insertAnimalSchema, data);
        if (!validatedData.success) {
            return {
                success: false,
                error: 'Validation failed',
                validationErrors: validatedData.errors
            };
        }

        const [newAnimal] = await db
            .insert(animals)
            .values(validatedData.data)
            .returning();

        revalidatePath('/dashboard/animals');

        return createSuccessResponse(newAnimal, 'Animal created successfully');

    } catch (error) {
        console.error('Error creating animal:', error);
        return handleDatabaseError(error);
    }
}

/**
 * Update an existing animal
 */
export async function updateAnimal(id: string, data: Partial<InsertAnimal>): Promise<ActionResult<Animal>> {
    try {
        const validatedId = idSchema.parse(id);
        const validatedData = validateInput(insertAnimalSchema.partial(), data);

        if (!validatedData.success) {
            return {
                success: false,
                error: 'Validation failed',
                validationErrors: validatedData.errors
            };
        }

        const [updatedAnimal] = await db
            .update(animals)
            .set({
                ...validatedData.data,
                updatedAt: new Date(),
            })
            .where(eq(animals.id, validatedId))
            .returning();

        if (!updatedAnimal) {
            return createErrorResponse('Animal not found');
        }

        revalidatePath('/dashboard/animals');
        revalidatePath(`/dashboard/animals/${id}`);

        return createSuccessResponse(updatedAnimal, 'Animal updated successfully');

    } catch (error) {
        console.error('Error updating animal:', error);
        return handleDatabaseError(error);
    }
}

/**
 * Delete an animal
 */
export async function deleteAnimal(id: string): Promise<ActionResult> {
    try {
        const validatedId = idSchema.parse(id);

        // Check if animal exists
        const existingAnimal = await db
            .select({ displayName: animals.displayName })
            .from(animals)
            .where(eq(animals.id, validatedId))
            .limit(1);

        if (existingAnimal.length === 0) {
            return createErrorResponse('Animal not found');
        }

        // Check if animal has production stages
        const stageCount = await db
            .select({ count: count() })
            .from(productionStages)
            .where(eq(productionStages.animalId, validatedId));

        if (stageCount[0]?.count > 0) {
            return createErrorResponse(
                'Cannot delete animal',
                'This animal has associated production stages. Delete them first.'
            );
        }

        await db.delete(animals).where(eq(animals.id, validatedId));

        revalidatePath('/dashboard/animals');

        return createSuccessResponse(null, `Animal "${existingAnimal[0].displayName}" deleted successfully`);

    } catch (error) {
        console.error('Error deleting animal:', error);
        return handleDatabaseError(error);
    }
}

/**
 * Production Stage CRUD Operations
 */

/**
 * Get production stages for an animal
 */
export async function getProductionStages(
    animalId: string,
    filters: any = {}
): Promise<ActionResult<ProductionStage[]>> {
    try {
        const validatedAnimalId = idSchema.parse(animalId);

        const stages = await db
            .select()
            .from(productionStages)
            .where(eq(productionStages.animalId, validatedAnimalId))
            .orderBy(asc(productionStages.sequenceOrder));

        return createSuccessResponse(stages);

    } catch (error) {
        console.error('Error getting production stages:', error);
        return handleDatabaseError(error);
    }
}

/**
 * Create a new production stage
 */
export async function createProductionStage(data: InsertProductionStage): Promise<ActionResult<ProductionStage>> {
    try {
        const validatedData = validateInput(insertProductionStageSchema, data);
        if (!validatedData.success) {
            return {
                success: false,
                error: 'Validation failed',
                validationErrors: validatedData.errors
            };
        }

        const [newStage] = await db
            .insert(productionStages)
            .values(validatedData.data)
            .returning();

        revalidatePath('/dashboard/animals');
        revalidatePath(`/dashboard/animals/${data.animalId}`);

        return createSuccessResponse(newStage, 'Production stage created successfully');

    } catch (error) {
        console.error('Error creating production stage:', error);
        return handleDatabaseError(error);
    }
}

/**
 * Update a production stage
 */
export async function updateProductionStage(
    id: string,
    data: Partial<InsertProductionStage>
): Promise<ActionResult<ProductionStage>> {
    try {
        const validatedId = idSchema.parse(id);
        const validatedData = validateInput(insertProductionStageSchema.partial(), data);

        if (!validatedData.success) {
            return {
                success: false,
                error: 'Validation failed',
                validationErrors: validatedData.errors
            };
        }

        const [updatedStage] = await db
            .update(productionStages)
            .set({
                ...validatedData.data,
                updatedAt: new Date(),
            })
            .where(eq(productionStages.id, validatedId))
            .returning();

        if (!updatedStage) {
            return createErrorResponse('Production stage not found');
        }

        revalidatePath('/dashboard/animals');
        revalidatePath(`/dashboard/animals/${updatedStage.animalId}`);

        return createSuccessResponse(updatedStage, 'Production stage updated successfully');

    } catch (error) {
        console.error('Error updating production stage:', error);
        return handleDatabaseError(error);
    }
}

/**
 * Delete a production stage
 */
export async function deleteProductionStage(id: string): Promise<ActionResult> {
    try {
        const validatedId = idSchema.parse(id);

        // Get stage info before deletion
        const stageInfo = await db
            .select({
                name: productionStages.name,
                animalId: productionStages.animalId
            })
            .from(productionStages)
            .where(eq(productionStages.id, validatedId))
            .limit(1);

        if (stageInfo.length === 0) {
            return createErrorResponse('Production stage not found');
        }

        // Check if stage has requirements
        const requirementCount = await db
            .select({ count: count() })
            .from(animalRequirements)
            .where(eq(animalRequirements.productionStageId, validatedId));

        if (requirementCount[0]?.count > 0) {
            return createErrorResponse(
                'Cannot delete production stage',
                'This stage has associated nutritional requirements. Delete them first.'
            );
        }

        await db.delete(productionStages).where(eq(productionStages.id, validatedId));

        revalidatePath('/dashboard/animals');
        revalidatePath(`/dashboard/animals/${stageInfo[0].animalId}`);

        return createSuccessResponse(null, `Production stage "${stageInfo[0].name}" deleted successfully`);

    } catch (error) {
        console.error('Error deleting production stage:', error);
        return handleDatabaseError(error);
    }
}

/**
 * Get animal types for filtering
 */
export async function getAnimalTypes(): Promise<ActionResult<string[]>> {
    try {
        const types = await db
            .selectDistinct({ animalType: animals.animalType })
            .from(animals)
            .where(eq(animals.isActive, true))
            .orderBy(asc(animals.animalType));

        const result = types.map(t => t.animalType).filter(Boolean);

        return createSuccessResponse(result);

    } catch (error) {
        console.error('Error getting animal types:', error);
        return handleDatabaseError(error);
    }
}

/**
 * Get common animals (for quick selection)
 */
export async function getCommonAnimals(): Promise<ActionResult<Animal[]>> {
    try {
        const commonAnimals = await db
            .select()
            .from(animals)
            .where(and(
                eq(animals.isCommon, true),
                eq(animals.isActive, true)
            ))
            .orderBy(asc(animals.displayName));

        return createSuccessResponse(commonAnimals);

    } catch (error) {
        console.error('Error getting common animals:', error);
        return handleDatabaseError(error);
    }
}