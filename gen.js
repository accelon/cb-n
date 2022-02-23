/* 產生 offtext 格式 ，
   
*/

import { walkDOMOfftext,DOMFromString,xpath } from 'pitaka/xmlparser';
import { filesFromPattern, nodefs, readTextContent, readTextLines, writeChanged } from 'pitaka/cli';
import {getVols} from './bookcode.js';
import {pinPos,posPin,patchBuf, autoChineseBreak,ensureChunkHasPN,fromChineseNumber, autoBreak, toParagraphs} from 'pitaka/utils';
import { autoAlign } from 'pitaka/utils';
import {cbeta} from 'pitaka/format';
import Errata from './errata.js';
await nodefs;
const rootdir='N/';
const desfolder='off/';
const scfolder='../sc/pli/'
const bookcode=process.argv[2]||"dn1"
const folders=getVols(bookcode).map(v=>'N'+v +'/*') ;
const files=filesFromPattern( folders,'N');
const {g}=cbeta.onOpen;
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

const onOpen={
    g,
    note:(el,ctx)=>{
        ctx.isnote=true;
        ctx.notetext='';
    },
    milestone:(el,ctx)=>{ctx.started=true;},
    'pb':(el,ctx)=>{
        ctx.vol=el.attrs['xml:id'].substr(1,2);
    },
    'l':(el,ctx)=>{
        ctx.paratext+='\n^sz '
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
        let insertpoint=0;
        let lbnow=pnjson[ctx.lb];
        let insert=pnjson[prevlb];
        if (!insert&&!lbnow) return;
        if (lbnow && typeof lbnow!=='string') lbnow=lbnow[0];
        if (insert && typeof insert!=='string') {
            insertpoint=posPin(ctx.paratext, insert[1]);
            insert=insert[0];
            if (insertpoint) insert='\n'+insert;
        }
        const text=ctx.paratext.substr(0,insertpoint)
            +(insert?insert:'')
            +ctx.paratext.substr(insertpoint);
            const m=insert&&insert.match(/\^bk#([a-z\d]+)/);
        if(m) {
            if(bkid)writeOutput();
            bkid=m[1];
        }

        if (text) {
            let emitnl=false;
            if (insert&&insert.indexOf("^n")>-1) {
                ctx.compact=true;
                emitnl=true;
            }
            outcontent += (emitnl?("\n"+ctx.header):'')+text ;
            if (emitnl) ctx.header='';
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

const writeOutput=()=>{
    if (!outcontent.length)return;
    let lines=outcontent.split(/\r?\n/);    
    lines=lines.map(autoChineseBreak).join('\n').trim().split('\n');
    const sclines=readTextLines(scfolder+bkid+'.off');
    lines=autoAlign(lines,sclines);
    if (bkid && writeChanged(desfolder+bkid+'.off',lines.join('\n'))) {
        console.log('written',bkid,lines.length);
    }
    const notes=ctx.notes.map((t,idx)=>{
        return '^fn'+(idx+1)+' '+t;
    })
    notes.unshift('^bk#'+bkid+'.notes');
    if (bkid && writeChanged(desfolder+bkid+'.note.off',notes.join('\n'))){
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