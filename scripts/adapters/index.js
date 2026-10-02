// Which adapter collects each assembly. The g07 bill database is shared by three wards and 町田市.

import * as g07 from './g07.js';
import * as itabashi from './itabashi.js';
import * as katsushika from './katsushika.js';
import * as meguro from './meguro.js';
import * as nakano from './nakano.js';
import * as ota from './ota.js';
import * as setagaya from './setagaya.js';
import * as shibuya from './shibuya.js';
import * as shinagawa from './shinagawa.js';
import * as shinjuku from './shinjuku.js';
import * as suginami from './suginami.js';
import * as sumida from './sumida.js';
import * as taito from './taito.js';
import * as tokyo from './tokyo.js';
import * as tachikawa from './tachikawa.js';
import * as musashino from './musashino.js';
import * as ome from './ome.js';
import * as fuchu from './fuchu.js';
import * as chofu from './chofu.js';
import * as higashiyamato from './higashiyamato.js';
import * as akiruno from './akiruno.js';

/** @type {Record<string, { collect: typeof tokyo.collect }>} */
export const adapters = {
	tokyo,
	'tokyo/shinjuku': shinjuku,
	'tokyo/taito': taito,
	'tokyo/sumida': sumida,
	'tokyo/shinagawa': shinagawa,
	'tokyo/meguro': meguro,
	'tokyo/ota': ota,
	'tokyo/setagaya': setagaya,
	'tokyo/shibuya': shibuya,
	'tokyo/nakano': nakano,
	'tokyo/suginami': suginami,
	'tokyo/minato': g07,
	'tokyo/itabashi': itabashi,
	'tokyo/adachi': g07,
	'tokyo/katsushika': katsushika,
	'tokyo/edogawa': g07,
	'tokyo/machida': g07,
	'tokyo/tachikawa': tachikawa,
	'tokyo/musashino': musashino,
	'tokyo/ome': ome,
	'tokyo/fuchu': fuchu,
	'tokyo/chofu': chofu,
	'tokyo/higashiyamato': higashiyamato,
	'tokyo/akiruno': akiruno
};
