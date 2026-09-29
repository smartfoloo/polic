import { POLIC_CONTACT } from '$env/static/private';
import { publicAssemblies, today } from '$lib/server/data.js';

// The contact address is shown publicly for corrections and the privacy policy.
export const load = () => ({ contact: POLIC_CONTACT, assemblies: publicAssemblies, today });
