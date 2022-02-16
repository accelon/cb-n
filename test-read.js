import {nodefs} from 'pitaka/cli'
import { openBasket } from 'pitaka';
await nodefs;
const ptk=await openBasket('cb-n');
const [y0] = ptk.getPageRange('dn1.1');
const lines = (await ptk.readLines(y0,11)).map(it=>it[1]);

console.log(lines)