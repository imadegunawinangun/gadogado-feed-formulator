// Formulation CRUD operations
import { eq, ilike, and, asc, desc, count, sql, inArray } from 'drizzle-orm';
import { db } from '@/db';
import { formulations, formulationIngredients, ingredients, animals, productionStages } from '@/db/schema';
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
    insertFormulationSchema,
    type InsertFormulation,
    type Formulation
} from '@/db/schema/formulations';
import {
    insertFormulationIngredientSchema,
    type InsertFormulationIngredient,
    type FormulationIngredient
} from '@/db/schema/formulation-ingredients';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

/**
 * Schema for formulation filters
 */
const formulationFiltersSchema = z.object({
    animalId: z.string().uuid().optional(),
    productionStageId: z.string().uuid().optional(),
    status: z.string().optional(),
    formulationType: z.string().optional(),
    isPublic: z.boolean().optional(),
    createdBy: z.string().optional(),
});

/**
 * Schema for creating formulation with ingredients
 */
const createFormulationSchema = insertFormulationSchema.extend({
    ingredients: z.array(z.object({
        ingredientId: z.string().uuid(),
        quantity: z.number().positive(),
        percentage: z.number().min(0).max(100),
        ingredientRole: z.string(),
        isEssential: z.boolean().default(false),
    })).min(1, 'At least one ingredient is required')
});

/**
 * Get paginated formulations with search and filtering
 */
export async function getFormulations(
    filters: any = {},
    pagination: { page?: number; limit?: number } = {},
    sort: { field?: string; direction?: 'asc' | 'desc' } = { field: 'createdAt', direction: 'desc' }
): Promise<ActionResult<PaginatedResult<Formulation>>> {
    try {
        const validatedPagination = paginationSchema.parse(pagination);
        const validatedFilters = searchSchema.merge(formulationFiltersSchema).parse(filters);
        const validatedSort = z.object({
            field: z.enum(['name', 'costPerUnit', 'formulationScore', 'createdAt', 'useCount']),
            direction: z.enum(['asc', 'desc'])
        }).parse(sort);

        const { page, limit } = validatedPagination;
        const offset = (page - 1) * limit;

        // Build conditions
        const conditions = [];

        if (validatedFilters.search) {
            conditions.push(
                ilike(formulations.name, createLikePattern(validatedFilters.search))
            );
        }

        if (validatedFilters.animalId) {
            conditions.push(eq(formulations.animalId, validatedFilters.animalId));
        }

        if (validatedFilters.productionStageId) {
            conditions.push(eq(formulations.productionStageId, validatedFilters.productionStageId));
        }

        if (validatedFilters.status) {
            conditions.push(eq(formulations.status, validatedFilters.status));
        }

        if (validatedFilters.formulationType) {
            conditions.push(eq(formulations.formulationType, validatedFilters.formulationType));
        }

        if (validatedFilters.isPublic !== undefined) {
            conditions.push(eq(formulations.isPublic, validatedFilters.isPublic));
        }

        if (validatedFilters.createdBy) {
            conditions.push(eq(formulations.createdBy, validatedFilters.createdBy));
        }

        // Order by
        const orderBy = validatedSort.direction === 'asc'
            ? asc(formulations[validatedSort.field as keyof typeof formulations])
            : desc(formulations[validatedSort.field as keyof typeof formulations]);

        // Get total count
        const totalCountResult = await db
            .select({ count: count() })
            .from(formulations)
            .where(conditions.length > 0 ? and(...conditions) : undefined);

        const total = totalCountResult[0]?.count || 0;

        // Get paginated data with relationships
        const data = await db
            .select({
                ...formulations,
                animalName: animals.displayName,
                animalSpecies: animals.species,
                stageName: productionStages.name,
            })
            .from(formulations)
            .leftJoin(animals, eq(formulations.animalId, animals.id))
            .leftJoin(productionStages, eq(formulations.productionStageId, productionStages.id))
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(orderBy)
            .limit(limit)
            .offset(offset);

        return createSuccessResponse({
            data,
            pagination: calculatePagination(page, limit, total)
        });

    } catch (error) {
        console.error('Error getting formulations:', error);
        return handleDatabaseError(error);
    }
}

/**
 * Get a single formulation by ID with ingredients
 */
export async function getFormulationById(id: string): Promise<ActionResult<Formulation & { ingredients: any[] }>> {
    try {
        const validatedId = idSchema.parse(id);

        // Get formulation with relationships
        const formulationData = await db
            .select({
                ...formulations,
                animalName: animals.displayName,
                animalSpecies: animals.species,
                stageName: productionStages.name,
            })
            .from(formulations)
            .leftJoin(animals, eq(formulations.animalId, animals.id))
            .leftJoin(productionStages, eq(formulations.productionStageId, productionStages.id))
            .where(eq(formulations.id, validatedId))
            .limit(1);

        if (formulationData.length === 0) {
            return createErrorResponse('Formulation not found');
        }

        // Get formulation ingredients with ingredient details
        const ingredientsData = await db
            .select({
                ...formulationIngredients,
                ingredientName: ingredients.name,
                ingredientCategory: ingredients.category,
                ingredientCostPerUnit: ingredients.costPerUnit,
                ingredientUnit: ingredients.unit,
            })
            .from(formulationIngredients)
            .leftJoin(ingredients, eq(formulationIngredients.ingredientId, ingredients.id))
            .where(eq(formulationIngredients.formulationId, validatedId))
            .orderBy(asc(formulationIngredients.displayOrder));

        return createSuccessResponse({
            ...formulationData[0],
            ingredients: ingredientsData
        });

    } catch (error) {
        console.error('Error getting formulation:', error);
        return handleDatabaseError(error);
    }
}

/**
 * Create a new formulation with ingredients
 */
export async function createFormulation(data: any): Promise<ActionResult<Formulation & { ingredients: any[] }>> {
    try {
        const validatedData = validateInput(createFormulationSchema, data);
        if (!validatedData.success) {
            return {
                success: false,
                error: 'Validation failed',
                validationErrors: validatedData.errors
            };
        }

        const { ingredients: ingredientData, ...formulationData } = validatedData.data;

        // Validate that percentages sum to 100
        const totalPercentage = ingredientData.reduce((sum: number, ing: any) => sum + ing.percentage, 0);
        if (Math.abs(totalPercentage - 100) > 0.1) {
            return createErrorResponse(
                'Invalid ingredient percentages',
                `Ingredient percentages must sum to 100%. Current sum: ${totalPercentage.toFixed(1)}%`
            );
        }

        // Start transaction
        const result = await db.transaction(async (tx) => {
            // Create formulation
            const [newFormulation] = await tx
                .insert(formulations)
                .values({
                    ...formulationData,
                    ingredientCount: ingredientData.length,
                    mainIngredients: JSON.stringify(
                        ingredientData
                            .sort((a: any, b: any) => b.percentage - a.percentage)
                            .slice(0, 5)
                            .map((ing: any) => ({
                                ingredientId: ing.ingredientId,
                                percentage: ing.percentage
                            }))
                    ),
                    nutritionalAnalysis: '{}', // Will be calculated later
                    meetsRequirements: false, // Will be calculated later
                })
                .returning();

            // Create formulation ingredients
            const formulationIngredientsWithCost = await Promise.all(
                ingredientData.map(async (ing: any, index: number) => {
                    // Get ingredient cost
                    const [ingredient] = await tx
                        .select({ costPerUnit: ingredients.costPerUnit })
                        .from(ingredients)
                        .where(eq(ingredients.id, ing.ingredientId));

                    const ingredientCost = (ingredient?.costPerUnit || 0) * ing.quantity;
                    const costPercentage = (ingredientCost / parseFloat(formulationData.totalCost.toString())) * 100;

                    return {
                        formulationId: newFormulation.id,
                        ingredientId: ing.ingredientId,
                        quantity: ing.quantity,
                        percentage: ing.percentage,
                        proportion: ing.percentage / 100,
                        ingredientCost,
                        costPercentage,
                        ingredientRole: ing.ingredientRole,
                        isEssential: ing.isEssential,
                        sequenceOrder: index,
                        displayOrder: index,
                    };
                })
            );

            await tx
                .insert(formulationIngredients)
                .values(formulationIngredientsWithCost);

            return { formulation: newFormulation, ingredients: formulationIngredientsWithCost };
        });

        // Revalidate cache
        revalidatePath('/dashboard/formulations');

        return createSuccessResponse({
            ...result.formulation,
            ingredients: result.ingredients
        }, 'Formulation created successfully');

    } catch (error) {
        console.error('Error creating formulation:', error);
        return handleDatabaseError(error);
    }
}

/**
 * Update an existing formulation
 */
export async function updateFormulation(
    id: string,
    data: any
): Promise<ActionResult<Formulation & { ingredients: any[] }>> {
    try {
        const validatedId = idSchema.parse(id);

        const validatedData = validateInput(createFormulationSchema.partial(), data);
        if (!validatedData.success) {
            return {
                success: false,
                error: 'Validation failed',
                validationErrors: validatedData.errors
            };
        }

        const { ingredients: ingredientData, ...formulationData } = validatedData.data;

        // Check if formulation exists
        const existingFormulation = await db
            .select({ status: formulations.status })
            .from(formulations)
            .where(eq(formulations.id, validatedId))
            .limit(1);

        if (existingFormulation.length === 0) {
            return createErrorResponse('Formulation not found');
        }

        // Prevent editing of active formulations
        if (existingFormulation[0].status === 'active') {
            return createErrorResponse(
                'Cannot edit active formulation',
                'Deactivate the formulation first before making changes'
            );
        }

        // Start transaction
        const result = await db.transaction(async (tx) => {
            let updatedFormulation;

            // Update formulation basic data if provided
            if (Object.keys(formulationData).length > 0) {
                const [updated] = await tx
                    .update(formulations)
                    .set({
                        ...formulationData,
                        updatedAt: new Date(),
                    })
                    .where(eq(formulations.id, validatedId))
                    .returning();

                updatedFormulation = updated;
            }

            // Update ingredients if provided
            if (ingredientData) {
                // Validate that percentages sum to 100
                const totalPercentage = ingredientData.reduce((sum: number, ing: any) => sum + ing.percentage, 0);
                if (Math.abs(totalPercentage - 100) > 0.1) {
                    throw new Error(`Ingredient percentages must sum to 100%. Current sum: ${totalPercentage.toFixed(1)}%`);
                }

                // Remove existing ingredients
                await tx
                    .delete(formulationIngredients)
                    .where(eq(formulationIngredients.formulationId, validatedId));

                // Add new ingredients
                const newIngredients = await Promise.all(
                    ingredientData.map(async (ing: any, index: number) => {
                        const [ingredient] = await tx
                            .select({ costPerUnit: ingredients.costPerUnit })
                            .from(ingredients)
                            .where(eq(ingredients.id, ing.ingredientId));

                        const ingredientCost = (ingredient?.costPerUnit || 0) * ing.quantity;
                        const costPercentage = (ingredientCost / parseFloat(formulationData.totalCost?.toString() || '0')) * 100;

                        return {
                            formulationId: validatedId,
                            ingredientId: ing.ingredientId,
                            quantity: ing.quantity,
                            percentage: ing.percentage,
                            proportion: ing.percentage / 100,
                            ingredientCost,
                            costPercentage,
                            ingredientRole: ing.ingredientRole,
                            isEssential: ing.isEssential,
                            sequenceOrder: index,
                            displayOrder: index,
                        };
                    })
                );

                await tx
                    .insert(formulationIngredients)
                    .values(newIngredients);

                // Update formulation metadata
                await tx
                    .update(formulations)
                    .set({
                        ingredientCount: ingredientData.length,
                        mainIngredients: JSON.stringify(
                            ingredientData
                                .sort((a: any, b: any) => b.percentage - a.percentage)
                                .slice(0, 5)
                                .map((ing: any) => ({
                                    ingredientId: ing.ingredientId,
                                    percentage: ing.percentage
                                }))
                        ),
                        updatedAt: new Date(),
                    })
                    .where(eq(formulations.id, validatedId));

                return { ingredients: newIngredients };
            }

            return { formulation: updatedFormulation };
        });

        // Revalidate cache
        revalidatePath('/dashboard/formulations');
        revalidatePath(`/dashboard/formulations/${id}`);

        // Get updated formulation with ingredients
        return await getFormulationById(validatedId);

    } catch (error) {
        console.error('Error updating formulation:', error);
        return handleDatabaseError(error);
    }
}

/**
 * Delete a formulation
 */
export async function deleteFormulation(id: string): Promise<ActionResult> {
    try {
        const validatedId = idSchema.parse(id);

        // Get formulation info
        const formulationInfo = await db
            .select({
                name: formulations.name,
                status: formulations.status
            })
            .from(formulations)
            .where(eq(formulations.id, validatedId))
            .limit(1);

        if (formulationInfo.length === 0) {
            return createErrorResponse('Formulation not found');
        }

        // Prevent deletion of active formulations
        if (formulationInfo[0].status === 'active') {
            return createErrorResponse(
                'Cannot delete active formulation',
                'Deactivate the formulation first before deleting'
            );
        }

        // Delete formulation (cascade will handle ingredients)
        await db.delete(formulations).where(eq(formulations.id, validatedId));

        // Revalidate cache
        revalidatePath('/dashboard/formulations');

        return createSuccessResponse(
            null,
            `Formulation "${formulationInfo[0].name}" deleted successfully`
        );

    } catch (error) {
        console.error('Error deleting formulation:', error);
        return handleDatabaseError(error);
    }
}

/**
 * Activate/deactivate a formulation
 */
export async function toggleFormulationStatus(id: string, activate: boolean): Promise<ActionResult> {
    try {
        const validatedId = idSchema.parse(id);

        const [updatedFormulation] = await db
            .update(formulations)
            .set({
                status: activate ? 'active' : 'draft',
                updatedAt: new Date(),
            })
            .where(eq(formulations.id, validatedId))
            .returning();

        if (!updatedFormulation) {
            return createErrorResponse('Formulation not found');
        }

        revalidatePath('/dashboard/formulations');
        revalidatePath(`/dashboard/formulations/${id}`);

        return createSuccessResponse(
            updatedFormulation,
            `Formulation ${activate ? 'activated' : 'deactivated'} successfully`
        );

    } catch (error) {
        console.error('Error toggling formulation status:', error);
        return handleDatabaseError(error);
    }
}

/**
 * Get formulation types for filtering
 */
export async function getFormulationTypes(): Promise<ActionResult<string[]>> {
    try {
        const types = await db
            .selectDistinct({ formulationType: formulations.formulationType })
            .from(formulations)
            .orderBy(asc(formulations.formulationType));

        const result = types.map(t => t.formulationType).filter(Boolean);

        return createSuccessResponse(result);

    } catch (error) {
        console.error('Error getting formulation types:', error);
        return handleDatabaseError(error);
    }
}

/**
 * Duplicate a formulation
 */
export async function duplicateFormulation(id: string, newName: string): Promise<ActionResult<Formulation & { ingredients: any[] }>> {
    try {
        const validatedId = idSchema.parse(id);

        // Get original formulation with ingredients
        const originalResult = await getFormulationById(validatedId);
        if (!originalResult.success || !originalResult.data) {
            return createErrorResponse('Original formulation not found');
        }

        const original = originalResult.data;

        // Create new formulation
        const newFormulationData = {
            name: newName,
            description: original.description ? `Copy of: ${original.description}` : `Copy of ${original.name}`,
            formulationType: original.formulationType,
            animalId: original.animalId,
            productionStageId: original.productionStageId,
            targetWeight: original.targetWeight,
            targetFeedIntake: original.targetFeedIntake,
            formulationQuantity: original.formulationQuantity,
            optimizationObjective: original.optimizationObjective,
            optimizationWeight: original.optimizationWeight,
            constraints: original.constraints,
            totalCost: original.totalCost,
            costPerUnit: original.costPerUnit,
            costPerDay: original.costPerDay,
            dryMatterBasis: original.dryMatterBasis,
            moistureContent: original.moistureContent,
            createdBy: original.createdBy, // This should come from the current user
            status: 'draft', // New formulations start as draft
        };

        const ingredientsData = original.ingredients.map((ing: any) => ({
            ingredientId: ing.ingredientId,
            quantity: ing.quantity,
            percentage: ing.percentage,
            ingredientRole: ing.ingredientRole,
            isEssential: ing.isEssential,
        }));

        return await createFormulation({
            ...newFormulationData,
            ingredients: ingredientsData
        });

    } catch (error) {
        console.error('Error duplicating formulation:', error);
        return handleDatabaseError(error);
    }
}