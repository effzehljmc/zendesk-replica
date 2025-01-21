import { relations, sql } from 'drizzle-orm';
import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  serial,
  jsonb,
  integer,
  check,
  uniqueIndex
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

export const tags = pgTable('tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  color: text('color').notNull().default('#94a3b8'),
  usage_count: integer('usage_count').notNull().default(0),
  last_used_at: timestamp('last_used_at'),
  created_by_id: uuid('created_by_id')
    .references(() => profiles.id, { onDelete: 'set null' }),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
}, () => {
  return {
    name_length: check('tag_name_length', sql`char_length(name) BETWEEN 2 AND 30`),
    name_format: check('tag_name_format', sql`name ~ '^[a-zA-Z0-9\s\-_]+$'`),
    color_format: check('tag_color_format', sql`color ~ '^#[0-9A-Fa-f]{6}$'`),
  }
});

export const ticketTags = pgTable('ticket_tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  ticket_id: uuid('ticket_id')
    .notNull()
    .references(() => tickets.id, { onDelete: 'cascade' }),
  tag_id: uuid('tag_id')
    .notNull()
    .references(() => tags.id, { onDelete: 'cascade' }),
  created_by_id: uuid('created_by_id')
    .references(() => profiles.id, { onDelete: 'set null' }),
  created_at: timestamp('created_at').defaultNow().notNull(),
}, (table) => {
  return {
    ticket_tag_unique: uniqueIndex('ticket_tag_unique').on(table.ticket_id, table.tag_id),
  }
});

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

export const ticketNotes = pgTable('ticket_notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  ticketId: uuid('ticket_id')
    .notNull()
    .references(() => tickets.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  visibility: text('visibility', { enum: ['private', 'team', 'public'] })
    .notNull()
    .default('private'),
  createdById: uuid('created_by_id')
    .references(() => profiles.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const tagsRelations = relations(tags, ({ one, many }) => ({
  createdBy: one(profiles, {
    fields: [tags.created_by_id],
    references: [profiles.id],
  }),
  tickets: many(ticketTags),
}));

export const ticketTagsRelations = relations(ticketTags, ({ one }) => ({
  ticket: one(tickets, {
    fields: [ticketTags.ticket_id],
    references: [tickets.id],
  }),
  tag: one(tags, {
    fields: [ticketTags.tag_id],
    references: [tags.id],
  }),
  createdBy: one(profiles, {
    fields: [ticketTags.created_by_id],
    references: [profiles.id],
  }),
}));

export const ticketNotesRelations = relations(ticketNotes, ({ one }) => ({
  ticket: one(tickets, {
    fields: [ticketNotes.ticketId],
    references: [tickets.id],
  }),
  createdBy: one(profiles, {
    fields: [ticketNotes.createdById],
    references: [profiles.id],
  }),
}));

export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  customer: one(profiles, {
    fields: [tickets.customer_id],
    references: [profiles.id],
  }),
  assignedTo: one(profiles, {
    fields: [tickets.assigned_to_id],
    references: [profiles.id],
  }),
  tags: many(ticketTags),
  notes: many(ticketNotes),
})); 