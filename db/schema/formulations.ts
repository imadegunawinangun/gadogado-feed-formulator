import {
    pgTable,
    uuid,
    varchar,
    text,
    decimal,
    integer,
    boolean,
    timestamp,
    jsonb
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { animals } from "./animals";
import { productionStages } from "./production-stages";

/**
 * Formulations table for saved feed recipes
 * Stores complete feed formulation results with all associated data
 */
export const formulations = pgTable("formulations", {
    id: uuid("id").defaultRandom().primaryKey(),

    // Basic information
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    formulationType: varchar("formulation_type", { length: 50 }).notNull(), // "Optimal", "Least Cost", "Custom"
    status: varchar("status", { length: 20 }).default("draft").notNull(), // "draft", "active", "archived"

    // Target animal and stage
    animalId: uuid("animal_id")
        .notNull()
        .references(() => animals.id, { onDelete: "restrict" }),

    productionStageId: uuid("production_stage_id")
        .notNull()
        .references(() => productionStages.id, { onDelete: "restrict" }),

    // Formulation parameters
    targetWeight: decimal("target_weight", { precision: 8, scale: 3 }), // Target animal weight in kg
    targetFeedIntake: decimal("target_feed_intake", { precision: 8, scale: 3 }), // Daily feed intake in kg
    formulationQuantity: decimal("formulation_quantity", { precision: 10, scale: 2 }).notNull(), // Total quantity formulated

    // Optimization settings
    optimizationObjective: varchar("optimization_objective", { length: 50 }).notNull(), // "cost", "quality", "balanced"
    optimizationWeight: jsonb("optimization_weight"), // Weight factors for different objectives
    constraints: jsonb("constraints"), // Optimization constraints used

    // Cost information
    totalCost: decimal("total_cost", { precision: 12, scale: 2 }).notNull(), // Total cost per quantity
    costPerUnit: decimal("cost_per_unit", { precision: 10, scale: 2 }).notNull(), // Cost per kg or ton
    costPerDay: decimal("cost_per_day", { precision: 10, scale: 2 }), // Cost per animal per day

    // Nutritional analysis results
    nutritionalAnalysis: jsonb("nutritional_analysis").notNull(), // Complete nutritional breakdown
    meetsRequirements: boolean("meets_requirements").notNull(), // Whether formulation meets all requirements
    requirementCompliance: jsonb("requirement_compliance"), // Detailed compliance information

    // Ingredient composition
    ingredientCount: integer("ingredient_count").notNull(), // Number of ingredients used
    mainIngredients: jsonb("main_ingredients"), // Top 5 ingredients with percentages

    // Quality metrics
    formulationScore: decimal("formulation_score", { precision: 5, scale: 2 }), // Overall quality score 0-100
    balanceScore: decimal("balance_score", { precision: 5, scale: 2 }), // Nutritional balance score
    costEfficiency: decimal("cost_efficiency", { precision: 5, scale: 2 }), // Cost efficiency score

    // Technical details
    dryMatterBasis: boolean("dry_matter_basis").default(false).notNull(), // Formulation on DM or as-fed basis
    moistureContent: decimal("moisture_content", { precision: 5, scale: 2 }), // Moisture content percentage

    // Validation and approval
    isValidated: boolean("is_validated").default(false).notNull(),
    validationDate: timestamp("validation_date"),
    validator: varchar("validator", { length: 255 }),
    validationNotes: text("validation_notes"),

    // Usage tracking
    isPublic: boolean("is_public").default(false).notNull(), // Share with other users
    useCount: integer("use_count").default(0).notNull(), // Times this formulation has been used
    lastUsed: timestamp("last_used"),

    // Versioning
    version: integer("version").default(1).notNull(),
    parentFormulationId: uuid("parent_formulation_id").references(() => formulations.id),

    // Sharing and collaboration
    sharedWith: jsonb("shared_with"), // Array of user IDs this is shared with
    tags: jsonb("tags"), // Tags for categorization and search

    // Metadata
    createdBy: varchar("created_by", { length: 255 }).notNull(),
    updatedBy: varchar("updated_by", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Zod schemas for validation
export const insertFormulationSchema = createInsertSchema(formulations, {
    name: z.string().min(1).max(255),
    description: z.string().optional(),
    formulationType: z.enum(["Optimal", "Least Cost", "Custom", "Template"]),
    status: z.enum(["draft", "active", "archived", "template"]).default("draft"),
    animalId: z.string().uuid(),
    productionStageId: z.string().uuid(),
    targetWeight: z.number().positive().optional(),
    targetFeedIntake: z.number().positive().optional(),
    formulationQuantity: z.number().positive(),
    optimizationObjective: z.enum(["cost", "quality", "balanced", "custom"]),
    optimizationWeight: z.record(z.number()).optional(),
    constraints: z.record(z.any()).optional(),
    totalCost: z.number().min(0),
    costPerUnit: z.number().min(0),
    costPerDay: z.number().min(0).optional(),
    nutritionalAnalysis: z.record(z.any()),
    meetsRequirements: z.boolean(),
    requirementCompliance: z.record(z.any()).optional(),
    ingredientCount: z.number().int().min(0),
    mainIngredients: z.array(z.any()).optional(),
    formulationScore: z.number().min(0).max(100).optional(),
    balanceScore: z.number().min(0).max(100).optional(),
    costEfficiency: z.number().min(0).max(100).optional(),
    dryMatterBasis: z.boolean().default(false),
    moistureContent: z.number().min(0).max(100).optional(),
    isValidated: z.boolean().default(false),
    validationDate: z.date().optional(),
    validator: z.string().max(255).optional(),
    validationNotes: z.string().optional(),
    isPublic: z.boolean().default(false),
    useCount: z.number().int().min(0).default(0),
    lastUsed: z.date().optional(),
    version: z.number().int().min(1).default(1),
    parentFormulationId: z.string().uuid().optional(),
    sharedWith: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    createdBy: z.string().min(1).max(255),
    updatedBy: z.string().max(255).optional(),
}).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

export const selectFormulationSchema = createSelectSchema(formulations);

export type Formulation = typeof formulations.$inferSelect;
export type NewFormulation = typeof formulations.$inferInsert;
export type InsertFormulation = z.infer<typeof insertFormulationSchema>;

// Formulation types for validation
export const FORMULATION_TYPES = [
    "Optimal",
    "Least Cost",
    "Custom",
    "Template"
] as const;

export const FORMULATION_STATUS = [
    "draft",
    "active",
    "archived",
    "template"
] as const;

export const OPTIMIZATION_OBJECTIVES = [
    "cost",
    "quality",
    "balanced",
    "custom"
] as const;