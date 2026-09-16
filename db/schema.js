import { sql } from 'drizzle-orm'
import { check, index, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core'

export const shortLinks = pgTable(
  'short_links',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    shortCode: varchar('short_code', { length: 12 }).notNull(),
    destinationUrl: text('destination_url').notNull(),
    managementTokenHash: varchar('management_token_hash', { length: 64 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('short_links_short_code_unique').on(table.shortCode),
    index('short_links_active_created_at_idx').on(table.deletedAt, table.createdAt),
    check('short_links_short_code_format', sql`${table.shortCode} ~ '^[a-z0-9]{6,12}$'`),
    check('short_links_destination_url_protocol', sql`${table.destinationUrl} ~ '^https?://'`),
  ],
)
