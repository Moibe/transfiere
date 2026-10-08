import { relations } from 'drizzle-orm';
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// Un cliente = un negocio con su propio portal (/c/<slug>), su marca y su clave.
// Las transferencias del dueño (Moibe) tienen client_id NULL.
export const clients = sqliteTable('clients', {
	id: text('id').primaryKey(),
	slug: text('slug').notNull().unique(),
	name: text('name').notNull(),
	color: text('color').notNull().default('#ff2d75'),
	// null = sin logo. El archivo vive en DATA_DIR/logos/<id>.
	logoMime: text('logo_mime'),
	passwordHash: text('password_hash').notNull(),
	createdAt: integer('created_at', { mode: 'timestamp_ms' })
		.notNull()
		.$defaultFn(() => new Date()),
	updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
		.notNull()
		.$defaultFn(() => new Date())
});

// Una transferencia = un link (/t/<id>) con uno o más archivos.
// Los bytes viven en disco (DATA_DIR/<transferId>/<fileId>); aquí solo va la metadata.
export const transfers = sqliteTable(
	'transfers',
	{
		id: text('id').primaryKey(),
		clientId: text('client_id').references(() => clients.id, { onDelete: 'cascade' }),
		message: text('message'),
		// 'uploading' mientras se suben los chunks; 'ready' cuando todos los archivos están completos.
		status: text('status', { enum: ['uploading', 'ready'] }).notNull().default('uploading'),
		totalSize: integer('total_size').notNull().default(0),
		createdAt: integer('created_at', { mode: 'timestamp_ms' })
			.notNull()
			.$defaultFn(() => new Date()),
		expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull()
	},
	(t) => [index('transfers_client_idx').on(t.clientId)]
);

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

export const clientsRelations = relations(clients, ({ many }) => ({
	transfers: many(transfers)
}));

export const transfersRelations = relations(transfers, ({ many, one }) => ({
	files: many(files),
	client: one(clients, { fields: [transfers.clientId], references: [clients.id] })
}));

export const filesRelations = relations(files, ({ one }) => ({
	transfer: one(transfers, { fields: [files.transferId], references: [transfers.id] })
}));

export type Client = typeof clients.$inferSelect;
export type Transfer = typeof transfers.$inferSelect;
export type TransferFile = typeof files.$inferSelect;
export type TransferWithFiles = Transfer & { files: TransferFile[]; client?: Client | null };
