﻿import {meta_cbeta,walkDOMOfftext,DOMFromString,xpath, filesFromPattern, nodefs, 
    readTextContent, readTextLines, writeChanged ,patchBuf,autoChineseBreak,autoAlign, combineHeaders} from 'ptk/nodebundle.cjs';
import {red} from 'ptk/cli/colors.cjs'
import {getVols} from './bookcode.js';
import Errata from './errata.js';
import {stripNotes} from './notes.js'
import {onOpen,onClose,onText} from './parser.js'
await nodefs;
const rootdir='N/';
const scfolder='../sc/pli/'
const bookcode=process.argv[2]||"dn"
const folders=getVols(bookcode).map(v=>'N'+v +'/*') ;
const files=filesFromPattern( folders,'N');
console.log('node gen filepat [p]');
let paramode=process.argv[3]==='p';
const desfolder=paramode?'par/':'off/';
const bkpf=bookcode.replace(/\d+$/,'');

const ctx={onText,started:false,hide:0,isheader:true,header:'',paratext:'', lb:'', notes:[], outcontent:'',bkid:''};
ctx.pnjson=JSON.parse(readTextContent('inserts/'+bkpf+'.json').replace(/\/\/.+/g,''));


ctx.writeOutput=()=>{
    if (!ctx.outcontent.length)return;
    ctx.outcontent= ctx.outcontent.replace(/\n\n\^n/g,'\n^n');

    let lines=ctx.outcontent.trimStart().split(/\r?\n/);   
    let sclines=null;
    const msfile=scfolder+ctx.bkid+'.ms.off';
    if (fs.existsSync(msfile)){
	    sclines=readTextLines(msfile);
	    if (!paramode) {
	        lines=lines.map(autoChineseBreak).join('\n').trim().split('\n');
	        lines=combineHeaders(lines.join('\n')).split('\n')
	        lines=autoAlign(lines,sclines,ctx.bkid);
	    }
   } else {
       lines=lines.map(autoChineseBreak).join('\n').trim().split('\n');
   }

    lines=stripNotes(lines,ctx);

    ctx.outcontent=lines.join('\n');
    const outfn=desfolder+ctx.bkid+'.yh.ori.off'
    const linecountwarning=lines.length!==sclines?.length?red("!="+sclines?.length):'';
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
    const buf=meta_cbeta.tidy(patchBuf(readTextContent(rootdir+file),Errata[file],file));
    
    const el=DOMFromString(buf);
    const body=xpath(el,'text/body');
    ctx.charmap=meta_cbeta.buildCharMap(xpath(el,'teiHeader/encodingDesc/charDecl'));
    walkDOMOfftext(body,ctx,onOpen, onClose).trim();
});

ctx.writeOutput();
// writeChanged(bkpf+'.json.new',JSON.stringify(pnjson,'',' '))