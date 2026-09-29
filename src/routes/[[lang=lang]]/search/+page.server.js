import { allLiveBills } from '$lib/server/data.js';

export const load = () => ({ bills: allLiveBills() });
