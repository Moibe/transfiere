// Helpers de formato compartidos entre server y cliente (sin dependencias).

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

export function formatBytes(bytes: number, decimals = 1): string {
	if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
	const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), UNITS.length - 1);
	const value = bytes / 1024 ** i;
	const fixed = i === 0 ? value.toFixed(0) : value.toFixed(value >= 100 ? 0 : decimals);
	return `${fixed} ${UNITS[i]}`;
}

export function formatSpeed(bytesPerSecond: number): string {
	return `${formatBytes(bytesPerSecond)}/s`;
}

/** "~ 4 min", "~ 35 s", "~ 1 h 12 min" */
export function formatEta(seconds: number): string {
	if (!Number.isFinite(seconds) || seconds < 0) return '…';
	if (seconds < 5) return 'ya casi';
	if (seconds < 60) return `~ ${Math.round(seconds)} s`;
	const minutes = Math.round(seconds / 60);
	if (minutes < 60) return `~ ${minutes} min`;
	const hours = Math.floor(minutes / 60);
	return `~ ${hours} h ${minutes % 60} min`;
}

const dateFmt = new Intl.DateTimeFormat('es-MX', {
	day: 'numeric',
	month: 'long',
	year: 'numeric'
});
const dateTimeFmt = new Intl.DateTimeFormat('es-MX', {
	day: 'numeric',
	month: 'short',
	hour: '2-digit',
	minute: '2-digit'
});

export function formatDate(d: Date | number | string): string {
	return dateFmt.format(new Date(d));
}

export function formatDateTime(d: Date | number | string): string {
	return dateTimeFmt.format(new Date(d));
}

/** "en 6 días", "en 3 horas", "expirada" */
export function formatRemaining(expiresAt: Date | number | string): string {
	const ms = new Date(expiresAt).getTime() - Date.now();
	if (ms <= 0) return 'expirada';
	const hours = Math.ceil(ms / 3_600_000);
	if (hours < 24) return `en ${hours} ${hours === 1 ? 'hora' : 'horas'}`;
	const days = Math.ceil(ms / 86_400_000);
	return `en ${days} ${days === 1 ? 'día' : 'días'}`;
}

export function pluralFiles(n: number): string {
	return `${n} ${n === 1 ? 'archivo' : 'archivos'}`;
}

/** Extensión en minúsculas, sin punto ("pdf", "mp4"); "" si no tiene. */
export function fileExt(name: string): string {
	const i = name.lastIndexOf('.');
	return i > 0 ? name.slice(i + 1).toLowerCase() : '';
}
