/* 產生 offtext 格式 ，
   
*/

import { walkDOMOfftext,DOMFromString,xpath } from 'pitaka/xmlparser';
import { filesFromPattern, nodefs, readTextContent, readTextLines, writeChanged } from 'pitaka/cli';
import {getVols} from './bookcode.js';
import {pinPos,posPin,patchBuf, autoChineseBreak,ensureChunkHasPN,fromChineseNumber
,ensurefirstLineHasPN,autoAlign} from 'pitaka/utils';
import {cbeta} from 'pitaka/format';
import Errata from './errata.js';
await nodefs;
const rootdir='N/';
const scfolder='../sc/pli/'
const bookcode=process.argv[2]||"dn1"
const folders=getVols(bookcode).map(v=>'N'+v +'/*') ;
const files=filesFromPattern( folders,'N');
const {g}=cbeta.onOpen;
console.log('node gen filepat [p]');
let paramode=process.argv[3]==='p';
const desfolder=paramode?'par/':'off/';

const ctx={started:false,hide:0,isheader:true,header:'',paratext:'', lb:'', notes:[]};

const bkpf=bookcode.replace(/\d+$/,'');
const pnjson=JSON.parse(readTextContent('inserts/'+bkpf+'.json').replace(/\/\/.+/g,''));
let bkid=''; //currently output bkid; take from pnjson ^bk
let outcontent='';
const onText=(str,ctx)=>{
    if (!ctx.hide && ctx.started) {
        let t=str.trim();
        if (ctx.isnote) {
            ctx.notetext+=t;
        } else if (ctx.isheader && t) {
            if (ctx.mululevel) {
                ctx.header+='^z'+ctx.mululevel+'['+t+']';
                ctx.mululevel=0;
            } else {
                // ctx.header+='^h['+t+']';
            }
        }
        else {
            if (ctx.compact && t.charCodeAt(0)<0x7f) ctx.paratext+=' ';
            ctx.compact=false;
            ctx.paratext+=t;
        }
    }
}

const applyInserts=lb=>{
    let text=ctx.paratext, count=0,insertpoint=0;
    let newpara=false;
    while (true) {
        let insert=pnjson[lb+(count?'+'+count:'')];
        if (!insert) break;
        count++
        if (typeof insert!=='string') {
            insertpoint=posPin(text, insert[1]);
            insert=insert[0];
            if (insertpoint) insert='\n'+insert;    
        } else if (insert.indexOf("^n")>-1) {
            ctx.compact=true;
            newpara=true;
        }

        text=text.substr(0,insertpoint)
            +(insert?insert:'')
            +text.substr(insertpoint);

    }
    return [text,newpara];
}

const onOpen={
    g,
    note:(el,ctx)=>{
        ctx.isnote=true;
        ctx.notetext='';
    },
    'l':(el,ctx)=>{
        if (!ctx.isheader) ctx.paratext+='\n^sz '
    },
    milestone:(el,ctx)=>{ctx.started=true;},
    'pb':(el,ctx)=>{
        ctx.vol=el.attrs['xml:id'].substr(1,2);
    },
    'p':(el,ctx)=>{
        if (el.attrs["cb:place"]=="inline") {
            const cn=ctx.paratext.match(/([一二三四五六七八九十百千○〇]+)$/);
            if (cn) {
                ctx.paratext=ctx.paratext.substr(0,ctx.paratext.length-cn[1].length);
                ctx.paratext+='^m'+fromChineseNumber(cn[1]);
                ctx.compact=true;
            }
        }
    },
    'cb:mulu':(el,ctx)=>{if(ctx.started&&!ctx.hide) {
        ctx.isheader=true
        ctx.mululevel=el.attrs.level;
    }},
    'head':(el,ctx)=>{if(ctx.started&&!ctx.hide) {
        ctx.isheader=true;
    }},
    'lb':(el,ctx)=>{
        const prevlb=ctx.lb;
        ctx.lb=ctx.vol+'p'+el.attrs.n;
        let lbnow=pnjson[ctx.lb];
        let insert=pnjson[prevlb];
        if (!insert&&!lbnow) return;
        if (lbnow && typeof lbnow!=='string') lbnow=lbnow[0];
        
        let [text,newpara]=applyInserts(prevlb);

        const m=insert&&typeof insert==='string' &&insert.match(/\^bk#([a-z\d]+)/);
        if(m) {
            if(bkid)writeOutput();
            bkid=m[1];
        }

        if (text) {
            outcontent += (newpara?"\n"+ctx.header:'')+text ;
            if (newpara) ctx.header='';
            ctx.paratext='';
        }
    }
}
const onClose={

    note:(el,ctx)=>{
        ctx.notes.push(ctx.notetext);
        const notetag='^f'+ctx.notes.length;
        if (ctx.isheader) {
            ctx.header+=notetag;
        } else if (ctx.paratext) {
            ctx.paratext+=notetag;
        }
        ctx.compact=true;
        ctx.notetext='';
        ctx.isnote=false;
    },
    'cb:mulu':(el,ctx)=>{ctx.isheader=false},
    'head':(el,ctx)=>{ctx.isheader=false},
    'body':()=>{ctx.started=false}
};

const autoBreak=(lines,bkid)=>{
    lines=lines.map(autoChineseBreak).join('\n').trim().split('\n');
    const sclines=readTextLines(scfolder+bkid+'.sc.off');
    lines=autoAlign(lines,sclines,bkid);
    return lines;
}
const writeOutput=()=>{
    if (!outcontent.length)return;
    outcontent= outcontent.replace(/\n\n\^n/g,'\n^n');
    
    let lines=outcontent.trimLeft().split(/\r?\n/);   
    if (!paramode) lines=autoBreak(lines,bkid); 
    outcontent=lines.join('\n');
    outcontent=ensurefirstLineHasPN(outcontent);
    if (bkid && writeChanged(desfolder+bkid+'.cb.off',outcontent)) {
        console.log('written',desfolder+bkid,lines.length);
    }
    const notes=ctx.notes.map((t,idx)=>{
        return '^fn'+(idx+1)+' '+t;
    })
    notes.unshift('^bk#'+bkid+'.notes');
    if (bkid && writeChanged(desfolder+bkid+'.n.notes',notes.join('\n'))){
        //written note
    }
    bkid='';
    ctx.notes=[];
    outcontent='';
}


files.forEach(file=>{
    const buf=patchBuf(readTextContent(rootdir+file),Errata[file],file);
    const el=DOMFromString(buf);
    const body=xpath(el,'text/body');
    ctx.charmap=cbeta.buildCharmap(xpath(el,'teiHeader/encodingDesc/charDecl'));
    walkDOMOfftext(body,ctx,onOpen, onClose,onText).trim();
});

writeOutput();
// writeChanged(bkpf+'.json.new',JSON.stringify(pnjson,'',' '))