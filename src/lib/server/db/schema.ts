import { relations } from 'drizzle-orm';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// Una transferencia = un link (/t/<id>) con uno o más archivos.
// Los bytes viven en disco (DATA_DIR/<transferId>/<fileId>); aquí solo va la metadata.
export const transfers = sqliteTable('transfers', {
	id: text('id').primaryKey(),
	message: text('message'),
	// 'uploading' mientras se suben los chunks; 'ready' cuando todos los archivos están completos.
	status: text('status', { enum: ['uploading', 'ready'] }).notNull().default('uploading'),
	totalSize: integer('total_size').notNull().default(0),
	createdAt: integer('created_at', { mode: 'timestamp_ms' })
		.notNull()
		.$defaultFn(() => new Date()),
	expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull()
});

export const files = sqliteTable(
	'files',
	{
		id: text('id').primaryKey(),
		transferId: text('transfer_id')
			.notNull()
			.references(() => transfers.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		size: integer('size').notNull(),
		mime: text('mime'),
		// Bytes ya escritos en disco (avanza chunk a chunk).
		uploaded: integer('uploaded').notNull().default(0),
		complete: integer('complete', { mode: 'boolean' }).notNull().default(false),
		downloads: integer('downloads').notNull().default(0),
		lastDownloadAt: integer('last_download_at', { mode: 'timestamp_ms' }),
		position: integer('position').notNull().default(0)
	},
	(t) => [index('files_transfer_idx').on(t.transferId)]
);

export const transfersRelations = relations(transfers, ({ many }) => ({
	files: many(files)
}));

export const filesRelations = relations(files, ({ one }) => ({
	transfer: one(transfers, { fields: [files.transferId], references: [transfers.id] })
}));

export type Transfer = typeof transfers.$inferSelect;
export type TransferFile = typeof files.$inferSelect;
export type TransferWithFiles = Transfer & { files: TransferFile[] };
