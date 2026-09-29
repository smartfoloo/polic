import { error } from '@sveltejs/kit';
import { board, liveBills } from '$lib/server/data.js';

// A bill page is its board with the bill open, so a shared link looks the same as clicking the card.
export const load = ({ params }) => {
	const bill = liveBills(params.assembly).find((b) => b.id === params.id);
	if (!bill) error(404, 'Not found');
	return { ...board(params.assembly), bill };
};
