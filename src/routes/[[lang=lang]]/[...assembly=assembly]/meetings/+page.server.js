import { publicAssemblies } from '$lib/server/data.js';

export const load = ({ params }) => ({ assembly: publicAssemblies.find((a) => a.id === params.assembly) });
