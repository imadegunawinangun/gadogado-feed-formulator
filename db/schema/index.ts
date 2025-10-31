// Main schema export file
// Exports all tables, types, and schemas for the Gadogado feed formulation system

// Core entity tables
export * from './auth';
export * from './ingredients';
export * from './nutrients';
export * from './animals';
export * from './production-stages';

// Junction and relationship tables
export * from './ingredient-nutrients';
export * from './animal-requirements';
export * from './formulations';
export * from './formulation-ingredients';

// Import all table schemas for index definitions
import { ingredients } from './ingredients';
import { nutrients } from './nutrients';
import { ingredientNutrients } from './ingredient-nutrients';
import { animals } from './animals';
import { productionStages } from './production-stages';
import { animalRequirements } from './animal-requirements';
import { formulations } from './formulations';
import { formulationIngredients } from './formulation-ingredients';
import { user } from './auth';

/**
 * Indexes for performance optimization
 * These indexes will be applied when the database is created
 */

// Ingredients table indexes
export const ingredientsIndexes = {
    // Search and filtering indexes
    ingredientsNameIdx: {
        table: ingredients,
        columns: ['name'],
        name: 'idx_ingredients_name'
    },
    ingredientsCategoryIdx: {
        table: ingredients,
        columns: ['category'],
        name: 'idx_ingredients_category'
    },
    ingredientsSupplierIdx: {
        table: ingredients,
        columns: ['supplier'],
        name: 'idx_ingredients_supplier'
    },
    ingredientsAvailableIdx: {
        table: ingredients,
        columns: ['isAvailable'],
        name: 'idx_ingredients_available'
    },
    ingredientsCostIdx: {
        table: ingredients,
        columns: ['costPerUnit'],
        name: 'idx_ingredients_cost'
    },
    // Composite indexes for common queries
    ingredientsCategoryCostIdx: {
        table: ingredients,
        columns: ['category', 'costPerUnit'],
        name: 'idx_ingredients_category_cost'
    }
};

// Nutrients table indexes
export const nutrientsIndexes = {
    nutrientsNameIdx: {
        table: nutrients,
        columns: ['name'],
        name: 'idx_nutrients_name'
    },
    nutrientsCategoryIdx: {
        table: nutrients,
        columns: ['category'],
        name: 'idx_nutrients_category'
    },
    nutrientsCategorySubcategoryIdx: {
        table: nutrients,
        columns: ['category', 'subcategory'],
        name: 'idx_nutrients_category_subcategory'
    },
    nutrientsVisibleIdx: {
        table: nutrients,
        columns: ['isVisible'],
        name: 'idx_nutrients_visible'
    },
    nutrientsDisplayOrderIdx: {
        table: nutrients,
        columns: ['displayOrder'],
        name: 'idx_nutrients_display_order'
    }
};

// Ingredient nutrients junction table indexes
export const ingredientNutrientsIndexes = {
    ingredientNutrientsIngredientIdx: {
        table: ingredientNutrients,
        columns: ['ingredientId'],
        name: 'idx_ingredient_nutrients_ingredient'
    },
    ingredientNutrientsNutrientIdx: {
        table: ingredientNutrients,
        columns: ['nutrientId'],
        name: 'idx_ingredient_nutrients_nutrient'
    },
    ingredientNutrientsValueIdx: {
        table: ingredientNutrients,
        columns: ['value'],
        name: 'idx_ingredient_nutrients_value'
    }
};

// Animals table indexes
export const animalsIndexes = {
    animalsSpeciesIdx: {
        table: animals,
        columns: ['species'],
        name: 'idx_animals_species'
    },
    animalsAnimalTypeIdx: {
        table: animals,
        columns: ['animalType'],
        name: 'idx_animals_type'
    },
    animalsSpeciesBreedIdx: {
        table: animals,
        columns: ['species', 'breed'],
        name: 'idx_animals_species_breed'
    },
    animalsCommonIdx: {
        table: animals,
        columns: ['isCommon'],
        name: 'idx_animals_common'
    },
    animalsActiveIdx: {
        table: animals,
        columns: ['isActive'],
        name: 'idx_animals_active'
    }
};

// Production stages table indexes
export const productionStagesIndexes = {
    productionStagesAnimalIdx: {
        table: productionStages,
        columns: ['animalId'],
        name: 'idx_production_stages_animal'
    },
    productionStagesSequenceOrderIdx: {
        table: productionStages,
        columns: ['sequenceOrder'],
        name: 'idx_production_stages_sequence_order'
    },
    productionStagesAnimalStageTypeIdx: {
        table: productionStages,
        columns: ['animalId', 'stageType'],
        name: 'idx_production_stages_animal_stage_type'
    }
};

// Animal requirements table indexes
export const animalRequirementsIndexes = {
    animalRequirementsAnimalIdx: {
        table: animalRequirements,
        columns: ['animalId'],
        name: 'idx_animal_requirements_animal'
    },
    animalRequirementsStageIdx: {
        table: animalRequirements,
        columns: ['productionStageId'],
        name: 'idx_animal_requirements_stage'
    },
    animalRequirementsNutrientIdx: {
        table: animalRequirements,
        columns: ['nutrientId'],
        name: 'idx_animal_requirements_nutrient'
    },
    animalRequirementsAnimalStageIdx: {
        table: animalRequirements,
        columns: ['animalId', 'productionStageId'],
        name: 'idx_animal_requirements_animal_stage'
    },
    animalRequirementsPriorityIdx: {
        table: animalRequirements,
        columns: ['priority'],
        name: 'idx_animal_requirements_priority'
    }
};

// Formulations table indexes
export const formulationsIndexes = {
    formulationsNameIdx: {
        table: formulations,
        columns: ['name'],
        name: 'idx_formulations_name'
    },
    formulationsAnimalIdx: {
        table: formulations,
        columns: ['animalId'],
        name: 'idx_formulations_animal'
    },
    formulationsStageIdx: {
        table: formulations,
        columns: ['productionStageId'],
        name: 'idx_formulations_stage'
    },
    formulationsStatusIdx: {
        table: formulations,
        columns: ['status'],
        name: 'idx_formulations_status'
    },
    formulationsTypeIdx: {
        table: formulations,
        columns: ['formulationType'],
        name: 'idx_formulations_type'
    },
    formulationsCostIdx: {
        table: formulations,
        columns: ['costPerUnit'],
        name: 'idx_formulations_cost'
    },
    formulationsScoreIdx: {
        table: formulations,
        columns: ['formulationScore'],
        name: 'idx_formulations_score'
    },
    formulationsCreatedByIdx: {
        table: formulations,
        columns: ['createdBy'],
        name: 'idx_formulations_created_by'
    },
    formulationsPublicIdx: {
        table: formulations,
        columns: ['isPublic'],
        name: 'idx_formulations_public'
    },
    // Composite indexes for common queries
    formulationsAnimalStageIdx: {
        table: formulations,
        columns: ['animalId', 'productionStageId'],
        name: 'idx_formulations_animal_stage'
    },
    formulationsStatusTypeIdx: {
        table: formulations,
        columns: ['status', 'formulationType'],
        name: 'idx_formulations_status_type'
    }
};

// Formulation ingredients junction table indexes
export const formulationIngredientsIndexes = {
    formulationIngredientsFormulationIdx: {
        table: formulationIngredients,
        columns: ['formulationId'],
        name: 'idx_formulation_ingredients_formulation'
    },
    formulationIngredientsIngredientIdx: {
        table: formulationIngredients,
        columns: ['ingredientId'],
        name: 'idx_formulation_ingredients_ingredient'
    },
    formulationIngredientsPercentageIdx: {
        table: formulationIngredients,
        columns: ['percentage'],
        name: 'idx_formulation_ingredients_percentage'
    },
    formulationIngredientsRoleIdx: {
        table: formulationIngredients,
        columns: ['ingredientRole'],
        name: 'idx_formulation_ingredients_role'
    },
    formulationIngredientsEssentialIdx: {
        table: formulationIngredients,
        columns: ['isEssential'],
        name: 'idx_formulation_ingredients_essential'
    }
};

// User table indexes for authentication
export const userIndexes = {
    userEmailIdx: {
        table: user,
        columns: ['email'],
        name: 'idx_user_email'
    },
    userCreatedAtIdx: {
        table: user,
        columns: ['createdAt'],
        name: 'idx_user_created_at'
    }
};

// All indexes combined for easy application
export const allIndexes = {
    ...ingredientsIndexes,
    ...nutrientsIndexes,
    ...ingredientNutrientsIndexes,
    ...animalsIndexes,
    ...productionStagesIndexes,
    ...animalRequirementsIndexes,
    ...formulationsIndexes,
    ...formulationIngredientsIndexes,
    ...userIndexes
};