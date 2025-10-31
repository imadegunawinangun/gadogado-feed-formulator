import {
    pgTable,
    uuid,
    varchar,
    text,
    decimal,
    integer,
    boolean,
    timestamp
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

/**
 * Animals table for different livestock types
 * Contains master data for all animal species and breeds that can be managed
 */
export const animals = pgTable("animals", {
    id: uuid("id").defaultRandom().primaryKey(),

    // Basic classification
    species: varchar("species", { length: 100 }).notNull(), // e.g., "Chicken", "Cattle", "Sheep", "Goat"
    breed: varchar("breed", { length: 100 }), // e.g., "Broiler", "Layer", "Holstein", "Angus"
    variety: varchar("variety", { length: 100 }), // e.g., "ISA Brown", "Ross 308"
    animalType: varchar("animal_type", { length: 50 }).notNull(), // e.g., "Poultry", "Ruminant", "Swine"

    // Display information
    displayName: varchar("display_name", { length: 255 }).notNull(),
    description: text("description"),
    image: text("image"), // URL to animal image
    scientificName: varchar("scientific_name", { length: 255 }), // e.g., "Gallus gallus domesticus"

    // Production characteristics
    primaryPurpose: varchar("primary_purpose", { length: 50 }), // e.g., "Meat", "Egg", "Milk", "Dual Purpose"
    productionSystem: varchar("production_system", { length: 100 }), // e.g., "Intensive", "Free Range", "Pasture"

    // Weight characteristics
    birthWeight: decimal("birth_weight", { precision: 8, scale: 3 }), // kg
    matureWeight: decimal("mature_weight", { precision: 8, scale: 3 }), // kg
    targetWeight: decimal("target_weight", { precision: 8, scale: 3 }), // kg for production

    // Growth rates
    averageDailyGain: decimal("average_daily_gain", { precision: 8, scale: 4 }), // kg/day
    growthPeriodDays: integer("growth_period_days"), // Days to reach target weight

    // Feed efficiency
    feedConversionRatio: decimal("feed_conversion_ratio", { precision: 5, scale: 3 }), // FCR
    feedEfficiencyRatio: decimal("feed_efficiency_ratio", { precision: 5, scale: 3 }), // FER

    // Production metrics
    dailyMilkYield: decimal("daily_milk_yield", { precision: 8, scale: 3 }), // kg/day (for dairy animals)
    eggProductionRate: decimal("egg_production_rate", { precision: 5, scale: 2 }), // eggs/hen/day
    woolYield: decimal("wool_yield", { precision: 8, scale: 3 }), // kg/year (for sheep)

    // Management
    isCommon: boolean("is_common").default(true).notNull(), // Common breeds for easy filtering
    isActive: boolean("is_active").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),

    // Geographic and environmental
    origin: varchar("origin", { length: 100 }), // Geographic origin
    climateSuitability: text("climate_suitability"), // Climate requirements

    // Management notes
    housingRequirements: text("housing_requirements"),
    healthConsiderations: text("health_considerations"),
    specialNutritionalNeeds: text("special_nutritional_needs"),

    // Reference information
    standardReference: varchar("standard_reference", { length: 100 }), // e.g., "NRC 1994", "AFRC 1993"
    referenceUrl: text("reference_url"),

    // Metadata
    createdBy: text("created_by"),
    updatedBy: text("updated_by"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Zod schemas for validation
export const insertAnimalSchema = createInsertSchema(animals, {
    species: z.string().min(1).max(100),
    breed: z.string().max(100).optional(),
    variety: z.string().max(100).optional(),
    animalType: z.string().min(1).max(50),
    displayName: z.string().min(1).max(255),
    description: z.string().optional(),
    image: z.string().url().optional(),
    scientificName: z.string().max(255).optional(),
    primaryPurpose: z.string().max(50).optional(),
    productionSystem: z.string().max(100).optional(),
    birthWeight: z.number().positive().optional(),
    matureWeight: z.number().positive().optional(),
    targetWeight: z.number().positive().optional(),
    averageDailyGain: z.number().positive().optional(),
    growthPeriodDays: z.number().int().positive().optional(),
    feedConversionRatio: z.number().positive().optional(),
    feedEfficiencyRatio: z.number().positive().optional(),
    dailyMilkYield: z.number().positive().optional(),
    eggProductionRate: z.number().positive().optional(),
    woolYield: z.number().positive().optional(),
    isCommon: z.boolean().default(true),
    isActive: z.boolean().default(true),
    sortOrder: z.number().int().default(0),
    origin: z.string().max(100).optional(),
    climateSuitability: z.string().optional(),
    housingRequirements: z.string().optional(),
    healthConsiderations: z.string().optional(),
    specialNutritionalNeeds: z.string().optional(),
    standardReference: z.string().max(100).optional(),
    referenceUrl: z.string().url().optional(),
    createdBy: z.string().optional(),
    updatedBy: z.string().optional(),
}).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

export const selectAnimalSchema = createSelectSchema(animals);

export type Animal = typeof animals.$inferSelect;
export type NewAnimal = typeof animals.$inferInsert;
export type InsertAnimal = z.infer<typeof insertAnimalSchema>;

// Animal types for validation
export const ANIMAL_TYPES = [
    "Poultry",
    "Ruminant",
    "Swine",
    "Aquaculture",
    "Equine",
    "Other"
] as const;

export const PRODUCTION_PURPOSES = [
    "Meat",
    "Egg",
    "Milk",
    "Wool",
    "Dual Purpose",
    "Breeding",
    "Other"
] as const;