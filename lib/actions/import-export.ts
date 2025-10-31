// Import and export functionality for ingredients and formulations
import { db } from '@/db';
import { ingredients, ingredientNutrients, nutrients } from '@/db/schema';
import { eq, ilike, and } from 'drizzle-orm';
import {
    ActionResult,
    createSuccessResponse,
    createErrorResponse,
    handleDatabaseError,
    idSchema
} from './common';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

/**
 * Schema for ingredient import data
 */
const importIngredientSchema = z.object({
    name: z.string().min(1).max(255),
    description: z.string().optional(),
    category: z.string().max(100).optional(),
    supplier: z.string().max(255).optional(),
    supplierCode: z.string().max(100).optional(),
    costPerUnit: z.number().positive(),
    unit: z.string().max(50).default('kg'),
    dryMatterPercentage: z.number().min(0).max(100).optional(),
    density: z.number().positive().optional(),
    isAvailable: z.boolean().default(true),
    minimumOrder: z.number().positive().optional(),
    maximumAvailable: z.number().positive().optional(),
    isOrganic: z.boolean().default(false),
    isGMO: z.boolean().default(false),
    isHalal: z.boolean().default(true),
    safetyNotes: z.string().optional(),
    // Nutritional data (simplified for import)
    nutritionalData: z.array(z.object({
        nutrientName: z.string(),
        value: z.number(),
        unit: z.string().optional(),
        confidenceLevel: z.number().int().min(1).max(5).default(1),
        dataSource: z.string().optional(),
    })).optional(),
});

/**
 * Schema for bulk import
 */
const bulkImportSchema = z.object({
    ingredients: z.array(importIngredientSchema).min(1),
    skipDuplicates: z.boolean().default(true),
    updateExisting: z.boolean().default(false),
});

/**
 * Import ingredients from CSV/JSON data
 */
export async function importIngredients(
    data: any[],
    options: { skipDuplicates?: boolean; updateExisting?: boolean } = {}
): Promise<ActionResult<{ imported: number; skipped: number; errors: string[] }>> {
    try {
        const validatedOptions = {
            skipDuplicates: options.skipDuplicates ?? true,
            updateExisting: options.updateExisting ?? false
        };

        const validatedData = bulkImportSchema.parse({
            ingredients: data,
            ...validatedOptions
        });

        let imported = 0;
        let skipped = 0;
        const errors: string[] = [];

        // Get all existing ingredient names for quick lookup
        const existingIngredients = await db
            .select({ name: ingredients.name, id: ingredients.id })
            .from(ingredients);

        const existingNames = new Set(existingIngredients.map(i => i.name));
        const existingMap = new Map(existingIngredients.map(i => [i.name, i.id]));

        // Get all nutrients for name lookup
        const allNutrients = await db
            .select({ id: nutrients.id, name: nutrients.name })
            .from(nutrients);

        const nutrientMap = new Map(allNutrients.map(n => [n.name.toLowerCase(), n.id]));

        for (const ingredientData of validatedData.ingredients) {
            try {
                // Check if ingredient already exists
                if (existingNames.has(ingredientData.name)) {
                    if (validatedOptions.skipDuplicates && !validatedOptions.updateExisting) {
                        skipped++;
                        continue;
                    }

                    if (validatedOptions.updateExisting) {
                        // Update existing ingredient
                        const ingredientId = existingMap.get(ingredientData.name)!;
                        const { nutritionalData, ...updateData } = ingredientData;

                        await db
                            .update(ingredients)
                            .set({
                                ...updateData,
                                updatedAt: new Date(),
                            })
                            .where(eq(ingredients.id, ingredientId));

                        // Handle nutritional data updates if provided
                        if (nutritionalData && nutritionalData.length > 0) {
                            // Remove existing nutritional data
                            await db
                                .delete(ingredientNutrients)
                                .where(eq(ingredientNutrients.ingredientId, ingredientId));

                            // Add new nutritional data
                            const nutritionalRecords = nutritionalData
                                .filter(nutrient => nutrientMap.has(nutrient.nutrientName.toLowerCase()))
                                .map(nutrient => ({
                                    ingredientId,
                                    nutrientId: nutrientMap.get(nutrient.nutrientName.toLowerCase())!,
                                    value: nutrient.value,
                                    confidenceLevel: nutrient.confidenceLevel || 1,
                                    dataSource: nutrient.dataSource,
                                }));

                            if (nutritionalRecords.length > 0) {
                                await db
                                    .insert(ingredientNutrients)
                                    .values(nutritionalRecords);
                            }
                        }

                        imported++;
                    } else {
                        skipped++;
                    }
                    continue;
                }

                // Create new ingredient
                const { nutritionalData, ...newIngredientData } = ingredientData;

                const [newIngredient] = await db
                    .insert(ingredients)
                    .values(newIngredientData)
                    .returning();

                // Add nutritional data if provided
                if (nutritionalData && nutritionalData.length > 0) {
                    const nutritionalRecords = nutritionalData
                        .filter(nutrient => nutrientMap.has(nutrient.nutrientName.toLowerCase()))
                        .map(nutrient => ({
                            ingredientId: newIngredient.id,
                            nutrientId: nutrientMap.get(nutrient.nutrientName.toLowerCase())!,
                            value: nutrient.value,
                            confidenceLevel: nutrient.confidenceLevel || 1,
                            dataSource: nutrient.dataSource,
                        }));

                    if (nutritionalRecords.length > 0) {
                        await db
                            .insert(ingredientNutrients)
                            .values(nutritionalRecords);
                    }
                }

                imported++;

            } catch (error) {
                console.error(`Error importing ingredient "${ingredientData.name}":`, error);
                errors.push(`Failed to import "${ingredientData.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }

        // Revalidate cache
        revalidatePath('/dashboard/ingredients');

        return createSuccessResponse({
            imported,
            skipped,
            errors
        }, `Import completed: ${imported} imported, ${skipped} skipped, ${errors.length} errors`);

    } catch (error) {
        console.error('Error importing ingredients:', error);
        return handleDatabaseError(error);
    }
}

/**
 * Export ingredients to CSV format
 */
export async function exportIngredientsToCSV(
    filters: { category?: string; supplier?: string; includeNutrients?: boolean } = {}
): Promise<ActionResult<{ filename: string; csvData: string }>> {
    try {
        const { includeNutrients = false, ...ingredientFilters } = filters;

        // Build query conditions
        const conditions = [];
        if (ingredientFilters.category) {
            conditions.push(eq(ingredients.category, ingredientFilters.category));
        }
        if (ingredientFilters.supplier) {
            conditions.push(eq(ingredients.supplier, ingredientFilters.supplier));
        }

        // Get ingredients
        const ingredientsList = await db
            .select()
            .from(ingredients)
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(ingredients.name);

        if (includeNutrients) {
            // Get nutritional data for all ingredients
            const nutritionalData = await db
                .select({
                    ingredientId: ingredientNutrients.ingredientId,
                    nutrientName: nutrients.name,
                    nutrientUnit: nutrients.unit,
                    value: ingredientNutrients.value,
                    confidenceLevel: ingredientNutrients.confidenceLevel,
                    dataSource: ingredientNutrients.dataSource,
                })
                .from(ingredientNutrients)
                .leftJoin(nutrients, eq(ingredientNutrients.nutrientId, nutrients.id))
                .where(
                    inArray(
                        ingredientNutrients.ingredientId,
                        ingredientsList.map(i => i.id)
                    )
                );

            // Group nutritional data by ingredient
            const nutritionMap = new Map();
            nutritionalData.forEach(nutrient => {
                if (!nutritionMap.has(nutrient.ingredientId)) {
                    nutritionMap.set(nutrient.ingredientId, []);
                }
                nutritionMap.get(nutrient.ingredientId).push(nutrient);
            });

            // Generate CSV with nutritional data
            const csvData = generateIngredientsWithNutrientsCSV(ingredientsList, nutritionMap);
            const filename = `ingredients_with_nutrients_${new Date().toISOString().split('T')[0]}.csv`;

            return createSuccessResponse({ filename, csvData });

        } else {
            // Generate basic ingredients CSV
            const csvData = generateBasicIngredientsCSV(ingredientsList);
            const filename = `ingredients_${new Date().toISOString().split('T')[0]}.csv`;

            return createSuccessResponse({ filename, csvData });
        }

    } catch (error) {
        console.error('Error exporting ingredients:', error);
        return handleDatabaseError(error);
    }
}

/**
 * Generate basic ingredients CSV
 */
function generateBasicIngredientsCSV(ingredientsList: any[]): string {
    const headers = [
        'Name',
        'Description',
        'Category',
        'Supplier',
        'Supplier Code',
        'Cost per Unit',
        'Unit',
        'Dry Matter %',
        'Density',
        'Is Available',
        'Minimum Order',
        'Maximum Available',
        'Is Organic',
        'Is GMO',
        'Is Halal',
        'Safety Notes',
        'Created At'
    ];

    const rows = ingredientsList.map(ingredient => [
        ingredient.name,
        ingredient.description || '',
        ingredient.category || '',
        ingredient.supplier || '',
        ingredient.supplierCode || '',
        ingredient.costPerUnit?.toString() || '',
        ingredient.unit || '',
        ingredient.dryMatterPercentage?.toString() || '',
        ingredient.density?.toString() || '',
        ingredient.isAvailable?.toString() || '',
        ingredient.minimumOrder?.toString() || '',
        ingredient.maximumAvailable?.toString() || '',
        ingredient.isOrganic?.toString() || '',
        ingredient.isGMO?.toString() || '',
        ingredient.isHalal?.toString() || '',
        ingredient.safetyNotes || '',
        ingredient.createdAt?.toISOString() || ''
    ]);

    return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
}

/**
 * Generate ingredients with nutrients CSV
 */
function generateIngredientsWithNutrientsCSV(ingredientsList: any[], nutritionMap: Map<string, any[]>): string {
    // Get all unique nutrient names
    const allNutrients = new Set<string>();
    nutritionMap.forEach(nutrients => {
        nutrients.forEach((nutrient: any) => {
            allNutrients.add(nutrient.nutrientName);
        });
    });

    const nutrientNames = Array.from(allNutrients).sort();

    const headers = [
        'Name',
        'Description',
        'Category',
        'Supplier',
        'Cost per Unit',
        'Unit',
        'Is Available',
        ...nutrientNames.map(name => `${name} (${nutritionMap.get(ingredientsList[0]?.id)?.find((n: any) => n.nutrientName === name)?.nutrientUnit || ''})`)
    ];

    const rows = ingredientsList.map(ingredient => {
        const ingredientNutrients = nutritionMap.get(ingredient.id) || [];
        const nutrientValues = nutrientNames.map(nutrientName => {
            const nutrient = ingredientNutrients.find((n: any) => n.nutrientName === nutrientName);
            return nutrient?.value?.toString() || '';
        });

        return [
            ingredient.name,
            ingredient.description || '',
            ingredient.category || '',
            ingredient.supplier || '',
            ingredient.costPerUnit?.toString() || '',
            ingredient.unit || '',
            ingredient.isAvailable?.toString() || '',
            ...nutrientValues
        ];
    });

    return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
}

/**
 * Get import template data
 */
export async function getImportTemplate(): Promise<ActionResult<{ template: any[]; nutrients: string[] }>> {
    try {
        // Get a sample ingredient structure
        const template = [{
            name: 'Sample Ingredient',
            description: 'This is a sample ingredient description',
            category: 'Energy Source',
            supplier: 'Sample Supplier',
            supplierCode: 'SUP001',
            costPerUnit: 2.50,
            unit: 'kg',
            dryMatterPercentage: 88.0,
            density: 650.0,
            isAvailable: true,
            minimumOrder: 1000,
            maximumAvailable: 100000,
            isOrganic: false,
            isGMO: false,
            isHalal: true,
            safetyNotes: 'Store in dry place',
            nutritionalData: [
                {
                    nutrientName: 'Crude Protein',
                    value: 12.5,
                    confidenceLevel: 2,
                    dataSource: 'Manufacturer Data'
                },
                {
                    nutrientName: 'Metabolizable Energy',
                    value: 2800,
                    confidenceLevel: 2,
                    dataSource: 'Manufacturer Data'
                }
            ]
        }];

        // Get available nutrients for reference
        const availableNutrients = await db
            .select({ name: nutrients.name })
            .from(nutrients)
            .where(eq(nutrients.isVisible, true))
            .orderBy(nutrients.name);

        const nutrientNames = availableNutrients.map(n => n.name);

        return createSuccessResponse({
            template,
            nutrients: nutrientNames
        });

    } catch (error) {
        console.error('Error getting import template:', error);
        return handleDatabaseError(error);
    }
}

/**
 * Validate import data before processing
 */
export async function validateImportData(data: any[]): Promise<ActionResult<{ valid: boolean; errors: string[]; warnings: string[] }>> {
    try {
        const errors: string[] = [];
        const warnings: string[] = [];

        if (!Array.isArray(data) || data.length === 0) {
            return createErrorResponse('No data provided', 'Please provide an array of ingredients to import');
        }

        // Check for required fields
        const seenNames = new Set<string>();
        let rowIndex = 1;

        for (const row of data) {
            const rowErrors: string[] = [];

            // Validate required fields
            if (!row.name || typeof row.name !== 'string' || row.name.trim().length === 0) {
                rowErrors.push('Name is required');
            }

            if (!row.costPerUnit || typeof row.costPerUnit !== 'number' || row.costPerUnit <= 0) {
                rowErrors.push('Cost per unit must be a positive number');
            }

            // Check for duplicate names
            if (row.name && seenNames.has(row.name.trim())) {
                rowErrors.push(`Duplicate ingredient name: "${row.name}"`);
            } else if (row.name) {
                seenNames.add(row.name.trim());
            }

            // Validate nutritional data if provided
            if (row.nutritionalData && Array.isArray(row.nutritionalData)) {
                row.nutritionalData.forEach((nutrient: any, nutrientIndex: number) => {
                    if (!nutrient.nutrientName || typeof nutrient.nutrientName !== 'string') {
                        rowErrors.push(`Nutrient ${nutrientIndex + 1}: Name is required`);
                    }
                    if (!nutrient.value || typeof nutrient.value !== 'number') {
                        rowErrors.push(`Nutrient ${nutrientIndex + 1}: Value must be a number`);
                    }
                });
            }

            if (rowErrors.length > 0) {
                errors.push(`Row ${rowIndex}: ${rowErrors.join(', ')}`);
            }

            rowIndex++;
        }

        // Check for existing ingredients in database
        if (seenNames.size > 0) {
            const existingIngredients = await db
                .select({ name: ingredients.name })
                .from(ingredients)
                .where(
                    // @ts-ignore
                    sql`${ingredients.name} = ANY(${Array.from(seenNames)})`
                );

            if (existingIngredients.length > 0) {
                warnings.push(`${existingIngredients.length} ingredient(s) already exist in the database and will be skipped or updated based on import options`);
            }
        }

        const isValid = errors.length === 0;

        return createSuccessResponse({
            valid: isValid,
            errors,
            warnings
        }, isValid ? 'Data validation passed' : 'Data validation failed');

    } catch (error) {
        console.error('Error validating import data:', error);
        return handleDatabaseError(error);
    }
}