// Which adapter collects each assembly. The g07 bill database is shared by three wards.

import * as g07 from './g07.js';
import * as katsushika from './katsushika.js';
import * as nakano from './nakano.js';
import * as setagaya from './setagaya.js';
import * as shibuya from './shibuya.js';
import * as shinagawa from './shinagawa.js';
import * as suginami from './suginami.js';
import * as sumida from './sumida.js';
import * as taito from './taito.js';
import * as tokyo from './tokyo.js';

/** @type {Record<string, { collect: typeof tokyo.collect }>} */
export const adapters = {
	tokyo,
	'tokyo/taito': taito,
	'tokyo/sumida': sumida,
	'tokyo/shinagawa': shinagawa,
	'tokyo/setagaya': setagaya,
	'tokyo/shibuya': shibuya,
	'tokyo/nakano': nakano,
	'tokyo/suginami': suginami,
	'tokyo/minato': g07,
	'tokyo/adachi': g07,
	'tokyo/katsushika': katsushika,
	'tokyo/edogawa': g07
};
