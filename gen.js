import { walkDOMOfftext,DOMFromString,xpath } from 'pitaka/xmlparser';
import {kluer, filesFromPattern, nodefs, readTextContent, readTextLines, writeChanged } from 'pitaka/cli';
import {getVols} from './bookcode.js';
import {patchBuf } from 'pitaka/utils';
import {autoChineseBreak,autoAlign, combineHeaders} from 'pitaka/align';
import {cbeta} from 'pitaka/format';
import Errata from './errata.js';
import {stripNotes} from './notes.js'
import {onOpen,onClose,onText} from './parser.js'
await nodefs;
const rootdir='N/';
const scfolder='../sc/pli/'
const bookcode=process.argv[2]||"dn1"
const folders=getVols(bookcode).map(v=>'N'+v +'/*') ;
const files=filesFromPattern( folders,'N');
const {yellow,red} =kluer;

console.log('node gen filepat [p]');
let paramode=process.argv[3]==='p';
const desfolder=paramode?'par/':'off/';
const bkpf=bookcode.replace(/\d+$/,'');

const ctx={started:false,hide:0,isheader:true,header:'',paratext:'', lb:'', notes:[], outcontent:'',bkid:''};
ctx.pnjson=JSON.parse(readTextContent('inserts/'+bkpf+'.json').replace(/\/\/.+/g,''));


ctx.writeOutput=()=>{
    if (!ctx.outcontent.length)return;
    ctx.outcontent= ctx.outcontent.replace(/\n\n\^n/g,'\n^n');

    let lines=ctx.outcontent.trimStart().split(/\r?\n/);   
    
    const sclines=readTextLines(scfolder+ctx.bkid+'.ms.off');
    if (!paramode) {
        lines=lines.map(autoChineseBreak).join('\n').trim().split('\n');
        lines=combineHeaders(lines.join('\n')).split('\n')
        lines=autoAlign(lines,sclines,ctx.bkid);
    }

    lines=stripNotes(lines,ctx);

    ctx.outcontent=lines.join('\n');
    const outfn=desfolder+ctx.bkid+'.cb.off'
    const linecountwarning=lines.length!==sclines.length?red("!="+sclines.length):'';
    if (ctx.bkid && writeChanged(outfn,ctx.outcontent)) {
        console.log('written',outfn,lines.length,linecountwarning);
    } else {
        console.log('same',outfn,lines.length,linecountwarning);
    }

    const noteout='['+ctx.notes.map( ([y,pin,val]) =>JSON.stringify({y,pin,val})).join(",\n")+']';

    if (ctx.bkid && writeChanged(desfolder+ctx.bkid+'.notes.json',noteout)){
        //written note
    }
    
    ctx.bkid='';
    ctx.notes=[];
    ctx.outcontent='';
}


files.forEach(file=>{
    const buf=patchBuf(readTextContent(rootdir+file),Errata[file],file);
    const el=DOMFromString(buf);
    const body=xpath(el,'text/body');
    ctx.charmap=cbeta.buildCharmap(xpath(el,'teiHeader/encodingDesc/charDecl'));
    walkDOMOfftext(body,ctx,onOpen, onClose,onText).trim();
});

ctx.writeOutput();
// writeChanged(bkpf+'.json.new',JSON.stringify(pnjson,'',' '))