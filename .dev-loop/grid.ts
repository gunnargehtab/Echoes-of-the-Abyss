import { paintGround, Biome, RIFT_GROUND, type MapGround } from '@echoes/shared';
import { missionMapById } from './src/sim/maps/index.ts';
const B: Record<number,string> = {}; for (const [k,v] of Object.entries(Biome)) if (typeof v==='number') B[v]=k.slice(0,2);
const [id, x0, x1, y0, y1] = process.argv.slice(2);
const g = id === 'overview' ? paintGround(RIFT_GROUND) : paintGround(missionMapById(id!)! as unknown as MapGround);
const xs = x0 ? +x0 : 0, xe = x1 ? +x1 : g.cols, ys = y0 ? +y0 : 0, ye = y1 ? +y1 : g.rows;
console.log(id, g.cols, 'x', g.rows, '@', g.cellM);
for (let r = ys; r < ye; r++) { let s = String(r).padStart(3) + ' '; for (let c = xs; c < xe; c++) { const i = r*g.cols+c; s += (B[g.biomes[i]!] + g.floor[i] + (g.ceiling[i] ? '^' + g.ceiling[i] : '')).padEnd(8); } console.log(s); }
