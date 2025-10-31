import {
    pgTable,
    uuid,
    decimal,
    integer,
    text,
    timestamp,
    boolean,
    varchar
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { formulations } from "./formulations";
import { ingredients } from "./ingredients";

/**
 * Formulation ingredients junction table
 * Stores the specific ingredient quantities and proportions for each formulation
 * Links formulations and ingredients with detailed usage information
 */
export const formulationIngredients = pgTable("formulation_ingredients", {
    id: uuid("id").defaultRandom().primaryKey(),

    // Foreign keys
    formulationId: uuid("formulation_id")
        .notNull()
        .references(() => formulations.id, { onDelete: "cascade" }),

    ingredientId: uuid("ingredient_id")
        .notNull()
        .references(() => ingredients.id, { onDelete: "restrict" }),

    // Quantities and proportions
    quantity: decimal("quantity", { precision: 12, scale: 4 }).notNull(), // Amount in formulation unit (kg, ton, etc.)
    percentage: decimal("percentage", { precision: 5, scale: 2 }).notNull(), // Percentage of total formulation
    proportion: decimal("proportion", { precision: 8, scale: 6 }).notNull(), // Proportion (0-1 scale)

    // Cost contribution
    ingredientCost: decimal("ingredient_cost", { precision: 10, scale: 2 }).notNull(), // Cost contribution
    costPercentage: decimal("cost_percentage", { precision: 5, scale: 2 }).notNull(), // % of total cost

    // Nutritional contribution
    nutritionalContribution: text("nutritional_contribution"), // JSON string of nutritional breakdown
    keyNutrients: text("key_nutrients"), // JSON string of key nutrients this ingredient provides

    // Ingredient role
    ingredientRole: varchar("ingredient_role", { length: 50 }).notNull(), // "Primary", "Secondary", "Supplement", "Filler"
    isEssential: boolean("is_essential").default(false).notNull(), // Whether this ingredient is essential
    canSubstitute: boolean("can_substitute").default(true).notNull(), // Whether this can be substituted

    // Constraints and limits
    minimumPercentage: decimal("minimum_percentage", { precision: 5, scale: 2 }), // Minimum required percentage
    maximumPercentage: decimal("maximum_percentage", { precision: 5, scale: 2 }), // Maximum allowed percentage
    constraintReason: text("constraint_reason"), // Reason for constraint

    // Quality and source information
    ingredientQuality: varchar("ingredient_quality", { length: 20 }).default("standard"), // "premium", "standard", "economy"
    sourceNote: text("source_note"), // Notes about ingredient source or quality

    // Processing requirements
    processingRequired: text("processing_required"), // Processing needed for this ingredient
    preparationNotes: text("preparation_notes"), // Preparation instructions

    // Supplier information for this specific use
    supplierForFormulation: varchar("supplier_for_formulation", { length: 255 }),
    supplierPrice: decimal("supplier_price", { precision: 10, scale: 2 }), // Price from specific supplier

    // Safety and handling
    safetyNotes: text("safety_notes"), // Safety considerations for this ingredient
    handlingRequirements: text("handling_requirements"), // Special handling requirements

    // Substitution information
    substituteIngredients: text("substitute_ingredients"), // JSON array of possible substitutes
    substitutionRules: text("substitution_rules"), // Rules for substitution

    // Ordering and sequence
    sequenceOrder: integer("sequence_order").notNull(), // Order in formulation list
    displayOrder: integer("display_order").notNull(), // Order for display purposes

    // Analysis and validation
    analysisConfidence: integer("analysis_confidence").default(1), // 1-5 scale of data confidence
    isEstimated: boolean("is_estimated").default(false), // Whether values are estimated
    estimationMethod: text("estimation_method"), // Method used for estimation

    // Metadata
    createdBy: text("created_by"),
    updatedBy: text("updated_by"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Zod schemas for validation
export const insertFormulationIngredientSchema = createInsertSchema(formulationIngredients, {
    formulationId: z.string().uuid(),
    ingredientId: z.string().uuid(),
    quantity: z.number().positive(),
    percentage: z.number().min(0).max(100),
    proportion: z.number().min(0).max(1),
    ingredientCost: z.number().min(0),
    costPercentage: z.number().min(0).max(100),
    nutritionalContribution: z.string().optional(),
    keyNutrients: z.string().optional(),
    ingredientRole: z.enum(["Primary", "Secondary", "Supplement", "Filler", "Additive"]),
    isEssential: z.boolean().default(false),
    canSubstitute: z.boolean().default(true),
    minimumPercentage: z.number().min(0).max(100).optional(),
    maximumPercentage: z.number().min(0).max(100).optional(),
    constraintReason: z.string().optional(),
    ingredientQuality: z.enum(["premium", "standard", "economy"]).default("standard"),
    sourceNote: z.string().optional(),
    processingRequired: z.string().optional(),
    preparationNotes: z.string().optional(),
    supplierForFormulation: z.string().max(255).optional(),
    supplierPrice: z.number().positive().optional(),
    safetyNotes: z.string().optional(),
    handlingRequirements: z.string().optional(),
    substituteIngredients: z.string().optional(),
    substitutionRules: z.string().optional(),
    sequenceOrder: z.number().int().default(0),
    displayOrder: z.number().int().default(0),
    analysisConfidence: z.number().int().min(1).max(5).default(1),
    isEstimated: z.boolean().default(false),
    estimationMethod: z.string().optional(),
    createdBy: z.string().optional(),
    updatedBy: z.string().optional(),
}).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

export const selectFormulationIngredientSchema = createSelectSchema(formulationIngredients);

export type FormulationIngredient = typeof formulationIngredients.$inferSelect;
export type NewFormulationIngredient = typeof formulationIngredients.$inferInsert;
export type InsertFormulationIngredient = z.infer<typeof insertFormulationIngredientSchema>;

// Unique constraint on formulationId + ingredientId to prevent duplicates
export const uniqueFormulationIngredient = {
    formulationIngredientUnique: {
        columns: ["formulationId", "ingredientId"],
        name: "formulation_ingredient_unique"
    }
};

// Ingredient roles for validation
export const INGREDIENT_ROLES = [
    "Primary",
    "Secondary",
    "Supplement",
    "Filler",
    "Additive"
] as const;

export const INGREDIENT_QUALITY_LEVELS = [
    "premium",
    "standard",
    "economy"
] as const;