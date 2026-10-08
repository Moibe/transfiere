// Tema por negocio: su color reemplaza el gradiente rosa→naranja de la marca Transfiere.
// Todo lo que usa var(--brand-grad) (botones, íconos, títulos) se pinta solo.

const HEX_RE = /^#[0-9a-f]{6}$/i;

export function brandStyle(color: string | null | undefined): string {
	if (!color || !HEX_RE.test(color)) return '';
	return `--brand-grad: linear-gradient(135deg, ${color} 0%, color-mix(in srgb, ${color} 72%, #000) 100%);`;
}

/** "Estudio Pixel" → "estudio-pixel" (para sugerir el slug al dar de alta). */
export function slugify(name: string): string {
	return name
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 40)
		.replace(/-+$/g, '');
}
