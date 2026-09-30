import { error } from '@sveltejs/kit';
import { topics } from '$lib/learn.js';

export const load = ({ params }) => {
	const i = topics.findIndex((x) => x.slug === params.topic);
	if (i < 0) error(404);
	return { topic: topics[i], next: topics[(i + 1) % topics.length] };
};

export const entries = () => topics.map((x) => ({ topic: x.slug }));
