import { toCard } from '$lib/bills.js';
import { allLiveBills } from '$lib/server/data.js';

export const load = () => ({
	latest: [...allLiveBills()]
		.filter((b) => !b.titleOnly && b.date)
		.sort((a, b) => /** @type {string} */ (b.date).localeCompare(/** @type {string} */ (a.date)) || a.id.localeCompare(b.id))
		.slice(0, 4)
		.map(toCard)
});
