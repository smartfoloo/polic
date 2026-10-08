// Which adapter collects each assembly. The g07 bill database is shared by three wards, 町田市, 藤沢市 and 海老名市.

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
import * as hachioji from './hachioji.js';
import * as tachikawa from './tachikawa.js';
import * as musashino from './musashino.js';
import * as ome from './ome.js';
import * as fuchu from './fuchu.js';
import * as chofu from './chofu.js';
import * as higashikurume from './higashikurume.js';
import * as higashiyamato from './higashiyamato.js';
import * as akiruno from './akiruno.js';
import * as inagi from './inagi.js';
import * as tama from './tama.js';
import * as kunitachi from './kunitachi.js';
import * as toshima from './toshima.js';
import * as bunkyo from './bunkyo.js';
import * as koto from './koto.js';
import * as komae from './komae.js';
import * as kokubunji from './kokubunji.js';
import * as nerima from './nerima.js';
import * as akishima from './akishima.js';
import * as hino from './hino.js';
import * as fussa from './fussa.js';
import * as musashimurayama from './musashimurayama.js';
import * as hamura from './hamura.js';
import * as nishitokyo from './nishitokyo.js';
import * as hinode from './hinode.js';
import * as yokohama from './yokohama.js';
import * as kawasaki from './kawasaki.js';
import * as zushi from './zushi.js';
import * as hadano from './hadano.js';
import * as yugawara from './yugawara.js';

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
	'tokyo/hachioji': hachioji,
	'tokyo/tachikawa': tachikawa,
	'tokyo/musashino': musashino,
	'tokyo/ome': ome,
	'tokyo/fuchu': fuchu,
	'tokyo/chofu': chofu,
	'tokyo/higashikurume': higashikurume,
	'tokyo/higashiyamato': higashiyamato,
	'tokyo/kunitachi': kunitachi,
	'tokyo/tama': tama,
	'tokyo/inagi': inagi,
	'tokyo/akiruno': akiruno,
	'tokyo/toshima': toshima,
	'tokyo/bunkyo': bunkyo,
	'tokyo/koto': koto,
	'tokyo/komae': komae,
	'tokyo/kokubunji': kokubunji,
	'tokyo/nerima': nerima,
	'tokyo/akishima': akishima,
	'tokyo/hino': hino,
	'tokyo/fussa': fussa,
	'tokyo/musashimurayama': musashimurayama,
	'tokyo/hamura': hamura,
	'tokyo/nishitokyo': nishitokyo,
	'tokyo/hinode': hinode,
	'kanagawa/yokohama': yokohama,
	'kanagawa/kawasaki': kawasaki,
	'kanagawa/fujisawa': g07,
	'kanagawa/zushi': zushi,
	'kanagawa/hadano': hadano,
	'kanagawa/ebina': g07,
	'kanagawa/yugawara': yugawara
};
