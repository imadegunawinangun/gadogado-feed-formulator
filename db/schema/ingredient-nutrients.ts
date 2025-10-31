import {
    pgTable,
    uuid,
    decimal,
    text,
    integer,
    boolean,
    timestamp
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { ingredients } from "./ingredients";
import { nutrients } from "./nutrients";

/**
 * Ingredient_nutrients junction table
 * Stores nutritional composition data for each ingredient
 * Many-to-many relationship between ingredients and nutrients
 */
export const ingredientNutrients = pgTable("ingredient_nutrients", {
    id: uuid("id").defaultRandom().primaryKey(),

    // Foreign keys
    ingredientId: uuid("ingredient_id")
        .notNull()
        .references(() => ingredients.id, { onDelete: "cascade" }),

    nutrientId: uuid("nutrient_id")
        .notNull()
        .references(() => nutrients.id, { onDelete: "cascade" }),

    // Nutritional values
    value: decimal("value", { precision: 10, scale: 4 }).notNull(),
    valueAsFed: decimal("value_as_fed", { precision: 10, scale: 4 }), // Value on as-fed basis
    valueDryMatter: decimal("value_dry_matter", { precision: 10, scale: 4 }), // Value on dry matter basis

    // Data quality and source
    confidenceLevel: integer("confidence_level").default(1), // 1-5 scale of data reliability
    dataSource: text("data_source"), // e.g., "Laboratory Analysis", "Manufacturer Data", "NRC Table"
    analysisDate: timestamp("analysis_date"),
    laboratoryName: text("laboratory_name"),
    sampleNumber: text("sample_number"),

    // Variability
    standardDeviation: decimal("standard_deviation", { precision: 10, scale: 4 }),
    minimumValue: decimal("minimum_value", { precision: 10, scale: 4 }),
    maximumValue: decimal("maximum_value", { precision: 10, scale: 4 }),
    sampleSize: integer("sample_size"),

    // Processing effects
    processingMethod: text("processing_method"), // e.g., "Raw", "Pelleted", "Extruded"
    processingEffect: text("processing_effect"), // Notes on how processing affects this nutrient

    // Bioavailability
    bioavailabilityFactor: decimal("bioavailability_factor", { precision: 5, scale: 3 }), // 0.0-1.0
    bioavailabilitySource: text("bioavailability_source"),

    // Validation and quality
    isValidated: boolean("is_validated").default(false),
    validationNotes: text("validation_notes"),
    isEstimated: boolean("is_estimated").default(false),

    // Metadata
    createdBy: text("created_by"),
    updatedBy: text("updated_by"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Zod schemas for validation
export const insertIngredientNutrientSchema = createInsertSchema(ingredientNutrients, {
    ingredientId: z.string().uuid(),
    nutrientId: z.string().uuid(),
    value: z.number(),
    valueAsFed: z.number().optional(),
    valueDryMatter: z.number().optional(),
    confidenceLevel: z.number().int().min(1).max(5).default(1),
    dataSource: z.string().optional(),
    analysisDate: z.date().optional(),
    laboratoryName: z.string().optional(),
    sampleNumber: z.string().optional(),
    standardDeviation: z.number().optional(),
    minimumValue: z.number().optional(),
    maximumValue: z.number().optional(),
    sampleSize: z.number().int().positive().optional(),
    processingMethod: z.string().optional(),
    processingEffect: z.string().optional(),
    bioavailabilityFactor: z.number().min(0).max(1).optional(),
    bioavailabilitySource: z.string().optional(),
    isValidated: z.boolean().default(false),
    validationNotes: z.string().optional(),
    isEstimated: z.boolean().default(false),
    createdBy: z.string().optional(),
    updatedBy: z.string().optional(),
}).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

export const selectIngredientNutrientSchema = createSelectSchema(ingredientNutrients);

export type IngredientNutrient = typeof ingredientNutrients.$inferSelect;
export type NewIngredientNutrient = typeof ingredientNutrients.$inferInsert;
export type InsertIngredientNutrient = z.infer<typeof insertIngredientNutrientSchema>;

// Unique constraint on ingredientId + nutrientId to prevent duplicates
export const uniqueIngredientNutrient = {
    ingredientNutrientUnique: {
        columns: ["ingredientId", "nutrientId"],
        name: "ingredient_nutrient_unique"
    }
};