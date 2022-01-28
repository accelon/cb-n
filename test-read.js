import {nodefs} from 'pitaka/cli'
import { openBasket } from 'pitaka';
await nodefs;
const ptk=await openBasket('cb-n');
console.log(ptk.header)