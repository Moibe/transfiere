// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Error {
			message: string;
			/** En los endpoints de subida: bytes que el server SÍ tiene, para que el cliente se resincronice. */
			uploaded?: number;
		}
		interface Locals {
			/** true si trae la cookie de la clave (puede subir/borrar). Descargar nunca la requiere. */
			authed: boolean;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
