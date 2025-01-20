import { relations } from 'drizzle-orm';
import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  serial,
  jsonb
} from 'drizzle-orm/pg-core';

export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  description: text('description'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  auth_user_id: text('auth_user_id').notNull().unique(),
  email: text('email').notNull().unique(),
  full_name: text('full_name').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const userRoles = pgTable('user_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  role_id: uuid('role_id')
    .notNull()
    .references(() => roles.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const tickets = pgTable('tickets', {
  id: uuid('id').primaryKey().defaultRandom(),
  ticket_number: serial('ticket_number').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  status: text('status', { enum: ['new', 'open', 'in-progress', 'resolved'] }).notNull().default('new'),
  priority: text('priority', { enum: ['low', 'medium', 'high'] }).notNull().default('medium'),
  customer_id: uuid('customer_id')
    .notNull()
    .references(() => profiles.id),
  assigned_to_id: uuid('assigned_to_id')
    .references(() => profiles.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const ticketsRelations = relations(tickets, ({ one }) => ({
  customer: one(profiles, {
    fields: [tickets.customer_id],
    references: [profiles.id],
  }),
  assignedTo: one(profiles, {
    fields: [tickets.assigned_to_id],
    references: [profiles.id],
  }),
}));

export const kbArticles = pgTable('kb_articles', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  is_public: boolean('is_public').default(false).notNull(),
  author_id: uuid('author_id')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const settings = pgTable('settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').notNull().unique(),
  value: jsonb('value').notNull(),
  description: text('description'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  updated_by_id: uuid('updated_by_id')
    .references(() => profiles.id, { onDelete: 'set null' }),
}); 