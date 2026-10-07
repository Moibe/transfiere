// Formas que viajan del server al cliente (fechas como epoch ms para que sobrevivan al JSON).

export type TransferStatus = 'uploading' | 'ready';

export type PublicFile = {
	id: string;
	name: string;
	size: number;
	mime: string | null;
	complete: boolean;
	uploaded: number;
};

export type PublicTransfer = {
	id: string;
	message: string | null;
	status: TransferStatus;
	totalSize: number;
	createdAt: number;
	expiresAt: number;
	files: PublicFile[];
};

export type AdminFile = PublicFile & {
	downloads: number;
	lastDownloadAt: number | null;
};

export type AdminTransfer = Omit<PublicTransfer, 'files'> & { files: AdminFile[] };
