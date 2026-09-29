// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// Bill popup (shallow routing): the bill shown over the board, or closed after a direct visit
		interface PageState {
			bill?: import('$lib/bills.js').PublicBill;
			closed?: boolean;
		}
		// interface Platform {}
	}
}

export {};
