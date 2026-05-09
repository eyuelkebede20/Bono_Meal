import { pgTable, uuid, varchar, timestamp, integer, boolean, numeric, pgEnum, text } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ==========================================
// ENUMS
// ==========================================
export const userRoleEnum = pgEnum("user_role", ["finance_admin", "security_guard", "super_admin", "student", "military_student", "military_staff", "cafe_manager"]);
export const mealTypeEnum = pgEnum("meal_type", ["breakfast", "lunch", "dinner"]);
export const haltRequestStatusEnum = pgEnum("halt_request_status", ["pending_admin", "approved_by_admin", "rejected", "refunded"]);
export const topUpStatusEnum = pgEnum("top_up_status", ["pending", "approved", "rejected", "reverted"]);
export const transactionTypeEnum = pgEnum("transaction_type", [
  "top_up",
  "meal_purchase",
  "manual_adjustment",
  "refund",
  "daily_deduction",
  "reversal",
  "deposit",
  "meal_deduction",
  "allowance_reset",
]); // Added: For the 3000 ETB monthly cron job
export const transactionStatusEnum = pgEnum("transaction_status", ["pending", "completed", "failed"]);
export const mealPlanTypeEnum = pgEnum("meal_plan_type", [
  "allowance_based", // For military (3000 ETB monthly reset)
  "prepaid", // For civilian/staff (bank authentication)
]);
// ==========================================
// TABLES
// ==========================================

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  firstName: varchar("first_name", { length: 255 }).notNull(),
  lastName: varchar("last_name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }).notNull().unique(),
  role: userRoleEnum("role").default("student").notNull(),
  password: text("password"),
  studentId: varchar("student_id", { length: 100 }),
  faydaId: varchar("fayda_id", { length: 100 }),
  verificationToken: varchar("verification_token", { length: 255 }),
  telegramChatId: varchar("telegram_chat_id", { length: 100 }),
  mealPlanType: mealPlanTypeEnum("meal_plan_type").default("prepaid").notNull(), // Added
  isApproved: boolean("is_approved").default(false),
  activeCardId: uuid("active_card_id"), // Foreign key added in relations
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  tokenVersion: integer("token_version").default(0).notNull(),
  telegramId: varchar("telegram_id", { length: 50 }),
  telegramLinkToken: varchar("telegram_link_token", { length: 64 }),
  approvedById: uuid("approved_by_id"),
});

export const cards = pgTable("cards", {
  id: uuid("id").defaultRandom().primaryKey(),
  cardNumber: varchar("card_number", { length: 255 }).notNull().unique(),
  ownerId: uuid("owner_id")
    .references(() => users.id)
    .notNull(),
  balance: numeric("balance", { precision: 12, scale: 2 }).default("0").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const attendance = pgTable("attendance", {
  id: uuid("id").defaultRandom().primaryKey(),
  studentId: uuid("student_id")
    .references(() => users.id)
    .notNull(),
  date: timestamp("date").defaultNow().notNull(),
  mealType: mealTypeEnum("meal_type").notNull(),
  scannedById: uuid("scanned_by_id")
    .references(() => users.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const blacklistedTokens = pgTable("blacklisted_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const haltRequests = pgTable("halt_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  reason: text("reason").notNull(),
  imageUrl: text("image_url").notNull(),
  status: haltRequestStatusEnum("status").default("pending_admin").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const otps = pgTable("otps", {
  id: uuid("id").defaultRandom().primaryKey(),
  phone: varchar("phone", { length: 50 }).notNull(),
  code: varchar("code", { length: 10 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const topUpRequests = pgTable("top_up_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  studentId: uuid("student_id")
    .references(() => users.id)
    .notNull(),
  transactionNumber: varchar("transaction_number", { length: 255 }).notNull().unique(),
  receiptImageUrl: text("receipt_image_url"), // Added: For bank transfer screenshots
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  status: topUpStatusEnum("status").default("pending").notNull(),
  handledById: uuid("handled_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const transactions = pgTable("transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  cardId: uuid("card_id")
    .references(() => cards.id)
    .notNull(),
  userId: uuid("user_id")
    .references(() => users.id)
    .notNull(),
  type: transactionTypeEnum("type").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  status: transactionStatusEnum("status").default("pending").notNull(),
  referenceId: varchar("reference_id", { length: 255 }),
  description: text("description"),
  approvedById: uuid("approved_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ==========================================
// RELATIONS
// ==========================================

export const usersRelations = relations(users, ({ one, many }) => ({
  // Disambiguate the dual-relationship between users and cards
  activeCard: one(cards, {
    fields: [users.activeCardId],
    references: [cards.id],
    relationName: "activeCardReference",
  }),
  approvedBy: one(users, {
    fields: [users.approvedById],
    references: [users.id],
    relationName: "staffApprovals",
  }),
  ownedCards: many(cards, { relationName: "cardOwner" }),
  attendance: many(attendance, { relationName: "studentAttendance" }),
  scannedAttendance: many(attendance, { relationName: "scannedBy" }),
  haltRequests: many(haltRequests),
  topUpRequests: many(topUpRequests, { relationName: "studentTopUps" }),
  handledTopUps: many(topUpRequests, { relationName: "handledTopUps" }),
  transactions: many(transactions, { relationName: "userTransactions" }),
  approvedTransactions: many(transactions, { relationName: "approvedTransactions" }),
}));

export const cardsRelations = relations(cards, ({ one, many }) => ({
  owner: one(users, {
    fields: [cards.ownerId],
    references: [users.id],
    relationName: "cardOwner",
  }),
  transactions: many(transactions),
}));

export const attendanceRelations = relations(attendance, ({ one }) => ({
  student: one(users, {
    fields: [attendance.studentId],
    references: [users.id],
    relationName: "studentAttendance",
  }),
  scannedBy: one(users, {
    fields: [attendance.scannedById],
    references: [users.id],
    relationName: "scannedBy",
  }),
}));

export const haltRequestsRelations = relations(haltRequests, ({ one }) => ({
  user: one(users, {
    fields: [haltRequests.userId],
    references: [users.id],
  }),
}));

export const topUpRequestsRelations = relations(topUpRequests, ({ one }) => ({
  student: one(users, {
    fields: [topUpRequests.studentId],
    references: [users.id],
    relationName: "studentTopUps",
  }),
  handledBy: one(users, {
    fields: [topUpRequests.handledById],
    references: [users.id],
    relationName: "handledTopUps",
  }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  card: one(cards, {
    fields: [transactions.cardId],
    references: [cards.id],
  }),
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
    relationName: "userTransactions",
  }),
  approvedBy: one(users, {
    fields: [transactions.approvedById],
    references: [users.id],
    relationName: "approvedTransactions",
  }),
}));
