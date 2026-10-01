import { flagsOf, summarize } from '$lib/admin/flags.js';
import { assemblies } from '$lib/config/assemblies.js';
import { assertDev, loadBills } from '$lib/server/admin.js';
import { QUEUES, reviewStatus } from '../../../scripts/lib/queues.js';

export const prerender = false;

export const load = async () => {
	assertDev();
	const bills = (await loadBills()).map(({ bill }) => {
		const { state, reasons, queues } = reviewStatus(bill);
		const name = bill.titleOnly ? bill.official : (bill.name ?? bill.official);
		return { id: bill.id, assembly: bill.assembly, name, state, queues, flags: summarize(flagsOf(bill, reasons)) };
	});
	return {
		queues: QUEUES,
		bills,
		assemblyNames: Object.fromEntries(assemblies.map((a) => [a.id, a.place]))
	};
};
