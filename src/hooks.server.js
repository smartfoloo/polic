/** @type {import('@sveltejs/kit').Handle} */
export const handle = ({ event, resolve }) => {
	const en = event.url.pathname === '/en' || event.url.pathname.startsWith('/en/');
	return resolve(event, { transformPageChunk: ({ html }) => html.replace('%lang%', en ? 'en' : 'ja') });
};
