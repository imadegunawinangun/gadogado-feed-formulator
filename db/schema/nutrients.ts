import {
    pgTable,
    text,
    decimal,
    integer,
    varchar,
    uuid,
    boolean
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

/**
 * Nutrients table for standardized nutrient definitions
 * Contains master data for all nutrients that can be tracked in formulations
 */
export const nutrients = pgTable("nutrients", {
    id: uuid("id").defaultRandom().primaryKey(),

    // Basic information
    name: varchar("name", { length: 100 }).notNull().unique(),
    displayName: varchar("display_name", { length: 255 }).notNull(),
    description: text("description"),

    // Categorization
    category: varchar("category", { length: 50 }).notNull(), // e.g., "Energy", "Protein", "Mineral", "Vitamin"
    subcategory: varchar("subcategory", { length: 50 }), // e.g., "Amino Acid", "Macro Mineral", "Fat Soluble"

    // Units and measurement
    unit: varchar("unit", { length: 20 }).notNull(), // e.g., "MJ/kg", "%", "g/kg", "mg/kg"
    unitType: varchar("unit_type", { length: 20 }).notNull(), // "percentage", "energy", "weight"
    decimalPlaces: integer("decimal_places").default(2).notNull(),

    // Analysis properties
    isAnalyzable: boolean("is_analyzable").default(true).notNull(),
    analysisMethod: varchar("analysis_method", { length: 255 }), // Lab analysis method
    isRequired: boolean("is_required").default(false).notNull(), // Must be specified for formulations

    // Display and ordering
    displayOrder: integer("display_order").default(0).notNull(),
    isVisible: boolean("is_visible").default(true).notNull(),
    highlightInReports: boolean("highlight_in_reports").default(false).notNull(),

    // Constraints
    minimumValue: decimal("minimum_value", { precision: 10, scale: 4 }),
    maximumValue: decimal("maximum_value", { precision: 10, scale: 4 }),

    // Nutrient relationships
    parentNutrientId: uuid("parent_nutrient_id").references(() => nutrients.id),

    // Standardization
    standardReference: varchar("standard_reference", { length: 100 }), // e.g., "NRC", "AFRC", "INRA"

    // Metadata
    createdAt: text("created_at").defaultNow().notNull(),
    updatedAt: text("updated_at").defaultNow().notNull(),
});

// Zod schemas for validation
export const insertNutrientSchema = createInsertSchema(nutrients, {
    name: z.string().min(1).max(100),
    displayName: z.string().min(1).max(255),
    description: z.string().optional(),
    category: z.string().min(1).max(50),
    subcategory: z.string().max(50).optional(),
    unit: z.string().min(1).max(20),
    unitType: z.enum(["percentage", "energy", "weight", "ratio"]),
    decimalPlaces: z.number().int().min(0).max(6).default(2),
    isAnalyzable: z.boolean().default(true),
    analysisMethod: z.string().max(255).optional(),
    isRequired: z.boolean().default(false),
    displayOrder: z.number().int().default(0),
    isVisible: z.boolean().default(true),
    highlightInReports: z.boolean().default(false),
    minimumValue: z.number().optional(),
    maximumValue: z.number().optional(),
    parentNutrientId: z.string().uuid().optional(),
    standardReference: z.string().max(100).optional(),
}).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

export const selectNutrientSchema = createSelectSchema(nutrients);

export type Nutrient = typeof nutrients.$inferSelect;
export type NewNutrient = typeof nutrients.$inferInsert;
export type InsertNutrient = z.infer<typeof insertNutrientSchema>;

// Common nutrient categories for validation
export const NUTRIENT_CATEGORIES = [
    "Energy",
    "Protein",
    "Amino Acid",
    "Fiber",
    "Fat",
    "Mineral",
    "Macro Mineral",
    "Trace Mineral",
    "Vitamin",
    "Fat Soluble Vitamin",
    "Water Soluble Vitamin",
    "Other"
] as const;

export const NUTRIENT_UNIT_TYPES = [
    "percentage",
    "energy",
    "weight",
    "ratio"
] as const;