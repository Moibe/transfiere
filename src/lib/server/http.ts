/**
 * Content-Disposition con nombre en ASCII (fallback) y en UTF-8 (RFC 5987), para que
 * "Fotos de Lau — ñandú.zip" baje con su nombre en cualquier navegador.
 */
export function contentDisposition(name: string): string {
	// eslint-disable-next-line no-control-regex
	const ascii = name.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
	const utf8 = encodeURIComponent(name).replace(
		/['()*]/g,
		(c) => '%' + c.charCodeAt(0).toString(16).toUpperCase()
	);
	return `attachment; filename="${ascii}"; filename*=UTF-8''${utf8}`;
}

/** "foto.jpg" → "foto (2).jpg" si ya hay otro igual dentro del zip. */
export function uniqueName(name: string, used: Set<string>): string {
	if (!used.has(name)) {
		used.add(name);
		return name;
	}
	const dot = name.lastIndexOf('.');
	const base = dot > 0 ? name.slice(0, dot) : name;
	const ext = dot > 0 ? name.slice(dot) : '';
	for (let n = 2; ; n++) {
		const candidate = `${base} (${n})${ext}`;
		if (!used.has(candidate)) {
			used.add(candidate);
			return candidate;
		}
	}
}
