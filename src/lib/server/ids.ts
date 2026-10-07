import { randomInt } from 'node:crypto';

// Sin 0/O/1/l/I para que el link se pueda dictar sin confusiones.
const ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function newId(length = 10): string {
	let out = '';
	for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
	return out;
}

// Los ids llegan por la URL: antes de tocar el disco se valida que tengan esta forma.
export const ID_RE = /^[A-Za-z0-9]{6,32}$/;

export function isValidId(value: string | undefined): value is string {
	return typeof value === 'string' && ID_RE.test(value);
}
