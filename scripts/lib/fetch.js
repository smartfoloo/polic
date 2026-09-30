// Polite fetcher for assembly websites. Rules come from the legal briefing (see PLAN.md):
// throttle hard, identify ourselves, obey robots.txt, only touch allowlisted hosts,
// reuse cached copies, and stop touching a host for the rest of the run on any error or slowdown.

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import robotsParser from 'robots-parser';

const BOT = 'PolicBot';
const MIN_DELAY_MS = 6_000;
const TIMEOUT_MS = 30_000;
const SLOW_MS = 10_000;
// Hosts that are always slow, not under load (港区's g07 database answers in ~15 s at any hour).
/** @type {Record<string, number>} */
const SLOW_MS_BY_HOST = { 'gikai2.city.minato.tokyo.jp': 25_000 };
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const CACHE_DIR = 'cache';

// With a host, only that host is off-limits for the rest of the run; without one, the whole run stops.
export class CrawlStopped extends Error {
	name = 'CrawlStopped';
	/**
	 * @param {string} message
	 * @param {string} [host]
	 */
	constructor(message, host) {
		super(message);
		this.host = host;
	}
}

/**
 * @typedef {object} FetchResult
 * @property {string} url
 * @property {Buffer} body
 * @property {string} contentType
 * @property {string} fetchedAt
 * @property {'cache' | 'not-modified' | 'network'} source
 */

/**
 * @typedef {object} Meta
 * @property {string} url
 * @property {string} fetchedAt
 * @property {string} contentType
 * @property {string} [etag]
 * @property {string} [lastModified]
 * @property {string} sha256
 */

const allowedHosts = new Set();
const lastRequestAt = new Map();
const robotsByOrigin = new Map();
const stoppedHosts = new Set();

/**
 * @param {string} host
 * @param {string} message
 */
function stopHost(host, message) {
	stoppedHosts.add(host);
	return new CrawlStopped(message, host);
}

/** @param {string[]} hosts */
export function allowHosts(hosts) {
	for (const h of hosts) allowedHosts.add(h);
}

// Refuse bulk runs during weekday office hours in Japan unless explicitly overridden.
export function assertOffPeak(argv = process.argv) {
	if (argv.includes('--daytime')) return;
	const jst = new Date(Date.now() + 9 * 60 * 60 * 1000);
	const day = jst.getUTCDay();
	const hour = jst.getUTCHours();
	if (day >= 1 && day <= 5 && hour >= 8 && hour < 19) {
		throw new CrawlStopped(
			'Weekday 08:00–19:00 JST is peak time for municipal sites. Run later, or pass --daytime for a small manual run.'
		);
	}
}

function userAgent() {
	const contact = process.env.POLIC_CONTACT;
	if (!contact) {
		throw new CrawlStopped('Set POLIC_CONTACT in .env — it goes in the user-agent so site admins can reach us.');
	}
	return `${BOT}/0.1 (civic bill summaries; contact: ${contact})`;
}

/**
 * @param {URL} url
 * @param {Record<string, string>} [headers]
 */
async function request(url, headers = {}) {
	const ua = userAgent();
	const wait = (lastRequestAt.get(url.host) ?? 0) + MIN_DELAY_MS - Date.now();
	if (wait > 0) await sleep(wait);
	lastRequestAt.set(url.host, Date.now());

	try {
		return await fetch(url, {
			headers: { 'User-Agent': ua, ...headers },
			signal: AbortSignal.timeout(TIMEOUT_MS)
		});
	} catch (err) {
		throw stopHost(url.host, `Network error for ${url}: ${/** @type {Error} */ (err).message}`);
	}
}

// RFC 9309: a missing robots.txt (4xx) allows everything; a server error means stay away.
/** @param {URL} url */
async function robotsFor(url) {
	let robots = robotsByOrigin.get(url.origin);
	if (robots) return robots;

	const robotsUrl = new URL('/robots.txt', url.origin);
	const res = await request(robotsUrl);
	if (res.status >= 500) throw stopHost(url.host, `robots.txt returned ${res.status} for ${url.origin}`);
	const isText = (res.headers.get('content-type') ?? '').startsWith('text/plain');
	const body = res.ok && isText ? await res.text() : '';
	robots = robotsParser(robotsUrl.href, body);
	robotsByOrigin.set(url.origin, robots);
	return robots;
}

/** @param {URL} url */
function cachePaths(url) {
	const key = createHash('sha1').update(url.href).digest('hex');
	const dir = join(CACHE_DIR, url.host);
	return { dir, body: join(dir, `${key}.body`), meta: join(dir, `${key}.json`) };
}

/**
 * @param {URL} url
 * @returns {Promise<{ meta: Meta, body: Buffer } | null>}
 */
async function readCache(url) {
	const paths = cachePaths(url);
	try {
		const meta = JSON.parse(await readFile(paths.meta, 'utf8'));
		return { meta, body: await readFile(paths.body) };
	} catch {
		return null;
	}
}

/**
 * @param {URL} url
 * @param {Meta} meta
 * @param {Buffer} body
 */
async function writeCache(url, meta, body) {
	const paths = cachePaths(url);
	await mkdir(paths.dir, { recursive: true });
	await writeFile(paths.body, body);
	await writeFile(paths.meta, JSON.stringify(meta, null, 2));
}

/**
 * @param {string} href
 * @returns {Promise<FetchResult>}
 */
export async function politeFetch(href) {
	const url = new URL(href);
	if (!allowedHosts.has(url.host)) throw new CrawlStopped(`Host not in allowlist: ${url.host}`);
	if (stoppedHosts.has(url.host)) throw new CrawlStopped(`${url.host} was stopped earlier in this run`, url.host);

	const cached = await readCache(url);
	if (cached && Date.now() - Date.parse(cached.meta.fetchedAt) < CACHE_TTL_MS) {
		return { url: href, body: cached.body, contentType: cached.meta.contentType, fetchedAt: cached.meta.fetchedAt, source: 'cache' };
	}

	const robots = await robotsFor(url);
	if (robots.isAllowed(url.href, BOT) === false) throw stopHost(url.host, `robots.txt disallows ${url.href}`);

	/** @type {Record<string, string>} */
	const conditional = {};
	if (cached?.meta.etag) conditional['If-None-Match'] = cached.meta.etag;
	if (cached?.meta.lastModified) conditional['If-Modified-Since'] = cached.meta.lastModified;

	const started = Date.now();
	const res = await request(url, conditional);
	const fetchedAt = new Date().toISOString();

	if (res.status === 304 && cached) {
		await writeCache(url, { ...cached.meta, fetchedAt }, cached.body);
		return { url: href, body: cached.body, contentType: cached.meta.contentType, fetchedAt, source: 'not-modified' };
	}
	if (!res.ok) throw stopHost(url.host, `${res.status} ${res.statusText} for ${href}`);

	const finalHost = new URL(res.url).host;
	if (!allowedHosts.has(finalHost)) throw stopHost(url.host, `${href} redirected off the allowlist to ${finalHost}`);

	const body = Buffer.from(await res.arrayBuffer());
	/** @type {Meta} */
	const meta = {
		url: href,
		fetchedAt,
		contentType: res.headers.get('content-type') ?? '',
		etag: res.headers.get('etag') ?? undefined,
		lastModified: res.headers.get('last-modified') ?? undefined,
		sha256: createHash('sha256').update(body).digest('hex')
	};
	await writeCache(url, meta, body);

	const elapsed = Date.now() - started;
	if (elapsed > (SLOW_MS_BY_HOST[url.host] ?? SLOW_MS)) throw stopHost(url.host, `${url.host} took ${elapsed}ms — the site may be under load, stopping.`);

	return { url: href, body, contentType: meta.contentType, fetchedAt, source: 'network' };
}

/**
 * Reads a page from cache/ only, however old, and never touches the network. For testing adapters
 * against saved pages (scripts/try.js).
 * @param {string} href
 * @returns {Promise<FetchResult>}
 */
export async function cacheOnlyFetch(href) {
	const cached = await readCache(new URL(href));
	if (!cached) throw new Error(`Not in cache: ${href}`);
	return { url: href, body: cached.body, contentType: cached.meta.contentType, fetchedAt: cached.meta.fetchedAt, source: 'cache' };
}

/**
 * Stores a page saved by hand (e.g. from a browser) as if the crawler had fetched it.
 * @param {string} href
 * @param {Buffer} body
 * @param {string} contentType
 * @param {string} [fetchedAt]
 */
export async function saveToCache(href, body, contentType, fetchedAt = new Date().toISOString()) {
	const sha256 = createHash('sha256').update(body).digest('hex');
	await writeCache(new URL(href), { url: href, fetchedAt, contentType, sha256 }, body);
}
