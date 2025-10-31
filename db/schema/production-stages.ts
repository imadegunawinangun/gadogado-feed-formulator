import {
    pgTable,
    uuid,
    varchar,
    text,
    integer,
    decimal,
    boolean,
    timestamp
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { animals } from "./animals";

/**
 * Production stages table for different growth and production phases
 * Links to animals and defines their nutritional requirements at different stages
 */
export const productionStages = pgTable("production_stages", {
    id: uuid("id").defaultRandom().primaryKey(),

    // Foreign key to animal
    animalId: uuid("animal_id")
        .notNull()
        .references(() => animals.id, { onDelete: "cascade" }),

    // Basic information
    name: varchar("name", { length: 100 }).notNull(), // e.g., "Starter", "Grower", "Finisher", "Lactation"
    displayName: varchar("display_name", { length: 255 }).notNull(),
    description: text("description"),

    // Stage characteristics
    stageType: varchar("stage_type", { length: 50 }).notNull(), // "Growth", "Production", "Maintenance", "Transition"
    productionPhase: varchar("production_phase", { length: 50 }), // "Early", "Mid", "Late", "Peak", "Decline"

    // Age/weight ranges
    startAgeDays: integer("start_age_days"), // Start age in days
    endAgeDays: integer("end_age_days"), // End age in days
    startWeight: decimal("start_weight", { precision: 8, scale: 3 }), // kg
    endWeight: decimal("end_weight", { precision: 8, scale: 3 }), // kg
    targetWeight: decimal("target_weight", { precision: 8, scale: 3 }), // kg

    // Duration
    durationDays: integer("duration_days"), // Typical duration of this stage
    minDurationDays: integer("min_duration_days"), // Minimum duration
    maxDurationDays: integer("max_duration_days"), // Maximum duration

    // Performance expectations
    expectedDailyGain: decimal("expected_daily_gain", { precision: 8, scale: 4 }), // kg/day
    targetFeedIntake: decimal("target_feed_intake", { precision: 8, scale: 3 }), // kg/day or % of body weight
    targetFeedConversionRatio: decimal("target_feed_conversion_ratio", { precision: 5, scale: 3 }), // FCR

    // Production metrics
    expectedProductionLevel: text("expected_production_level"), // e.g., "2.5 kg milk/day", "300 eggs/year"
    productionEfficiency: decimal("production_efficiency", { precision: 5, scale: 2 }), // %

    // Nutritional strategy
    feedingStrategy: text("feeding_strategy"), // e.g., "Ad libitum", "Restricted", "Phase feeding"
    nutritionalPriority: varchar("nutritional_priority", { length: 50 }), // "Growth", "Production", "Maintenance"

    // Management notes
    managementConsiderations: text("management_considerations"),
    healthMonitoringPoints: text("health_monitoring_points"),
    transitionNotes: text("transition_notes"), // Notes for transitioning to next stage

    // Environmental requirements
    temperatureRange: text("temperature_range"), // Optimal temperature range
    humidityRange: text("humidity_range"), // Optimal humidity range
    spaceRequirements: text("space_requirements"), // Space/animal requirements

    // Ordering and organization
    sequenceOrder: integer("sequence_order").notNull(), // Order in production cycle
    isCommon: boolean("is_common").default(true).notNull(),
    isActive: boolean("is_active").default(true).notNull(),

    // Reference information
    standardReference: varchar("standard_reference", { length: 100 }), // e.g., "NRC 1994", "BASF Guide"
    referenceUrl: text("reference_url"),

    // Metadata
    createdBy: text("created_by"),
    updatedBy: text("updated_by"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Zod schemas for validation
export const insertProductionStageSchema = createInsertSchema(productionStages, {
    animalId: z.string().uuid(),
    name: z.string().min(1).max(100),
    displayName: z.string().min(1).max(255),
    description: z.string().optional(),
    stageType: z.enum(["Growth", "Production", "Maintenance", "Transition"]),
    productionPhase: z.string().max(50).optional(),
    startAgeDays: z.number().int().min(0).optional(),
    endAgeDays: z.number().int().min(0).optional(),
    startWeight: z.number().positive().optional(),
    endWeight: z.number().positive().optional(),
    targetWeight: z.number().positive().optional(),
    durationDays: z.number().int().positive().optional(),
    minDurationDays: z.number().int().positive().optional(),
    maxDurationDays: z.number().int().positive().optional(),
    expectedDailyGain: z.number().positive().optional(),
    targetFeedIntake: z.number().positive().optional(),
    targetFeedConversionRatio: z.number().positive().optional(),
    expectedProductionLevel: z.string().optional(),
    productionEfficiency: z.number().min(0).max(100).optional(),
    feedingStrategy: z.string().optional(),
    nutritionalPriority: z.string().max(50).optional(),
    managementConsiderations: z.string().optional(),
    healthMonitoringPoints: z.string().optional(),
    transitionNotes: z.string().optional(),
    temperatureRange: z.string().optional(),
    humidityRange: z.string().optional(),
    spaceRequirements: z.string().optional(),
    sequenceOrder: z.number().int().default(0),
    isCommon: z.boolean().default(true),
    isActive: z.boolean().default(true),
    standardReference: z.string().max(100).optional(),
    referenceUrl: z.string().url().optional(),
    createdBy: z.string().optional(),
    updatedBy: z.string().optional(),
}).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

export const selectProductionStageSchema = createSelectSchema(productionStages);

export type ProductionStage = typeof productionStages.$inferSelect;
export type NewProductionStage = typeof productionStages.$inferInsert;
export type InsertProductionStage = z.infer<typeof insertProductionStageSchema>;

// Production stage types for validation
export const STAGE_TYPES = [
    "Growth",
    "Production",
    "Maintenance",
    "Transition"
] as const;

export const PRODUCTION_PHASES = [
    "Early",
    "Mid",
    "Late",
    "Peak",
    "Decline",
    "Prep",
    "Recovery"
] as const;