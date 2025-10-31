import {
    pgTable,
    text,
    decimal,
    timestamp,
    boolean,
    integer,
    varchar,
    uuid
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

/**
 * Ingredients table for storing feed ingredient information
 * Contains master data for all ingredients that can be used in formulations
 */
export const ingredients = pgTable("ingredients", {
    id: uuid("id").defaultRandom().primaryKey(),

    // Basic information
    name: varchar("name", { length: 255 }).notNull().unique(),
    description: text("description"),
    category: varchar("category", { length: 100 }), // e.g., "Energy Source", "Protein Source", "Mineral"

    // Supplier and cost information
    supplier: varchar("supplier", { length: 255 }),
    supplierCode: varchar("supplier_code", { length: 100 }),
    costPerUnit: decimal("cost_per_unit", { precision: 10, scale: 2 }).notNull(),
    unit: varchar("unit", { length: 50 }).notNull().default("kg"), // e.g., "kg", "ton", "bag"

    // Physical properties
    dryMatterPercentage: decimal("dry_matter_percentage", { precision: 5, scale: 2 }),
    density: decimal("density", { precision: 8, scale: 3 }), // kg/m³

    // Availability and constraints
    isAvailable: boolean("is_available").default(true).notNull(),
    minimumOrder: decimal("minimum_order", { precision: 10, scale: 2 }),
    maximumAvailable: decimal("maximum_available", { precision: 15, scale: 2 }),

    // Quality and safety
    isOrganic: boolean("is_organic").default(false),
    isGMO: boolean("is_gmo").default(false),
    isHalal: boolean("is_halal").default(true),
    safetyNotes: text("safety_notes"),

    // Metadata
    createdBy: varchar("created_by", { length: 255 }),
    updatedBy: varchar("updated_by", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Zod schemas for validation
export const insertIngredientSchema = createInsertSchema(ingredients, {
    name: z.string().min(1).max(255),
    description: z.string().optional(),
    category: z.string().max(100).optional(),
    supplier: z.string().max(255).optional(),
    supplierCode: z.string().max(100).optional(),
    costPerUnit: z.number().positive(),
    unit: z.string().max(50).default("kg"),
    dryMatterPercentage: z.number().min(0).max(100).optional(),
    density: z.number().positive().optional(),
    isAvailable: z.boolean().default(true),
    minimumOrder: z.number().positive().optional(),
    maximumAvailable: z.number().positive().optional(),
    isOrganic: z.boolean().default(false),
    isGMO: z.boolean().default(false),
    isHalal: z.boolean().default(true),
    safetyNotes: z.string().optional(),
}).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

export const selectIngredientSchema = createSelectSchema(ingredients);

export type Ingredient = typeof ingredients.$inferSelect;
export type NewIngredient = typeof ingredients.$inferInsert;
export type InsertIngredient = z.infer<typeof insertIngredientSchema>;