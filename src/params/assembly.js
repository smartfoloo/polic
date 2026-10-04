import { assemblies } from '$lib/config/assemblies.js';

/** Matches published assembly ids, including nested ones like tokyo/suginami. */
/** @type {import('@sveltejs/kit').ParamMatcher} */
export const match = (param) => assemblies.some((a) => a.id === param && a.published !== false);
