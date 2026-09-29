import { board } from '$lib/server/data.js';

export const load = ({ params }) => board(params.assembly);
