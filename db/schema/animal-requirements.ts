import {
    pgTable,
    uuid,
    decimal,
    text,
    integer,
    boolean,
    timestamp,
    varchar
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { animals } from "./animals";
import { productionStages } from "./production-stages";
import { nutrients } from "./nutrients";

/**
 * Animal requirements table
 * Stores nutritional requirements for specific animals at specific production stages
 * Links animals, production stages, and nutrients with requirement values
 */
export const animalRequirements = pgTable("animal_requirements", {
    id: uuid("id").defaultRandom().primaryKey(),

    // Foreign keys
    animalId: uuid("animal_id")
        .notNull()
        .references(() => animals.id, { onDelete: "cascade" }),

    productionStageId: uuid("production_stage_id")
        .notNull()
        .references(() => productionStages.id, { onDelete: "cascade" }),

    nutrientId: uuid("nutrient_id")
        .notNull()
        .references(() => nutrients.id, { onDelete: "cascade" }),

    // Requirement values (all on daily basis unless specified)
    minimumValue: decimal("minimum_value", { precision: 10, scale: 4 }), // Minimum daily requirement
    maximumValue: decimal("maximum_value", { precision: 10, scale: 4 }), // Maximum safe limit
    optimumValue: decimal("optimum_value", { precision: 10, scale: 4 }), // Optimal/Target value

    // Requirement basis
    requirementBasis: varchar("requirement_basis", { length: 50 }).notNull(), // "per_day", "per_kg_body_weight", "per_kg_feed"
    perUnitBodyWeight: decimal("per_unit_body_weight", { precision: 10, scale: 4 }), // If based on body weight
    perUnitFeed: decimal("per_unit_feed", { precision: 10, scale: 4 }), // If based on feed intake

    // Expressions
    percentageOfDiet: decimal("percentage_of_diet", { precision: 5, scale: 2 }), // % of total diet
    ratioToOtherNutrient: decimal("ratio_to_other_nutrient", { precision: 8, scale: 4 }), // e.g., Ca:P ratio
    referenceNutrientId: uuid("reference_nrient_id").references(() => nutrients.id), // For ratio calculations

    // Adjustment factors
    temperatureAdjustment: decimal("temperature_adjustment", { precision: 8, scale: 4 }), // % change per °C
    stressAdjustment: decimal("stress_adjustment", { precision: 8, scale: 4 }), // % increase under stress
    productionAdjustment: decimal("production_adjustment", { precision: 8, scale: 4 }), // Production-based adjustment

    // Safety margins and tolerances
    safetyMargin: decimal("safety_margin", { precision: 5, scale: 2 }), // Safety margin percentage
    toleranceRange: decimal("tolerance_range", { precision: 5, scale: 2 }), // Acceptable tolerance range

    // Constraint types for optimization
    constraintType: varchar("constraint_type", { length: 20 }).notNull(), // "minimum", "maximum", "equal", "range"
    priority: integer("priority").default(1).notNull(), // Priority in optimization (1=highest)
    isStrictConstraint: boolean("is_strict_constraint").default(false), // Must be exactly met in optimization

    // Data quality and source
    confidenceLevel: integer("confidence_level").default(1), // 1-5 scale of requirement reliability
    dataSource: text("data_source"), // e.g., "NRC 1994", "AFRC 1993", "INRA 2018"
    referencePage: varchar("reference_page", { length: 50 }), // Reference page number
    notes: text("notes"), // Additional notes about the requirement

    // Applicability
    isApplicable: boolean("is_applicable").default(true).notNull(),
    specialConditions: text("special_conditions"), // Conditions when this applies
    lifeStageNotes: text("life_stage_notes"), // Specific life stage considerations

    // Validation
    isValidated: boolean("is_validated").default(false),
    validationDate: timestamp("validation_date"),
    validator: varchar("validator", { length: 255 }),

    // Metadata
    createdBy: text("created_by"),
    updatedBy: text("updated_by"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Zod schemas for validation
export const insertAnimalRequirementSchema = createInsertSchema(animalRequirements, {
    animalId: z.string().uuid(),
    productionStageId: z.string().uuid(),
    nutrientId: z.string().uuid(),
    minimumValue: z.number().optional(),
    maximumValue: z.number().optional(),
    optimumValue: z.number().optional(),
    requirementBasis: z.enum(["per_day", "per_kg_body_weight", "per_kg_feed", "percentage"]),
    perUnitBodyWeight: z.number().optional(),
    perUnitFeed: z.number().optional(),
    percentageOfDiet: z.number().min(0).max(100).optional(),
    ratioToOtherNutrient: z.number().optional(),
    referenceNutrientId: z.string().uuid().optional(),
    temperatureAdjustment: z.number().optional(),
    stressAdjustment: z.number().optional(),
    productionAdjustment: z.number().optional(),
    safetyMargin: z.number().min(0).max(100).optional(),
    toleranceRange: z.number().min(0).max(100).optional(),
    constraintType: z.enum(["minimum", "maximum", "equal", "range"]),
    priority: z.number().int().min(1).max(10).default(1),
    isStrictConstraint: z.boolean().default(false),
    confidenceLevel: z.number().int().min(1).max(5).default(1),
    dataSource: z.string().optional(),
    referencePage: z.string().max(50).optional(),
    notes: z.string().optional(),
    isApplicable: z.boolean().default(true),
    specialConditions: z.string().optional(),
    lifeStageNotes: z.string().optional(),
    isValidated: z.boolean().default(false),
    validationDate: z.date().optional(),
    validator: z.string().max(255).optional(),
    createdBy: z.string().optional(),
    updatedBy: z.string().optional(),
}).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

export const selectAnimalRequirementSchema = createSelectSchema(animalRequirements);

export type AnimalRequirement = typeof animalRequirements.$inferSelect;
export type NewAnimalRequirement = typeof animalRequirements.$inferInsert;
export type InsertAnimalRequirement = z.infer<typeof insertAnimalRequirementSchema>;

// Unique constraint on animalId + productionStageId + nutrientId to prevent duplicates
export const uniqueAnimalRequirement = {
    animalRequirementUnique: {
        columns: ["animalId", "productionStageId", "nutrientId"],
        name: "animal_requirement_unique"
    }
};

// Requirement basis types for validation
export const REQUIREMENT_BASIS_TYPES = [
    "per_day",
    "per_kg_body_weight",
    "per_kg_feed",
    "percentage"
] as const;

export const CONSTRAINT_TYPES = [
    "minimum",
    "maximum",
    "equal",
    "range"
] as const;