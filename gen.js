/* 產生 offtext 格式 ，
   
*/

import { walkDOMOfftext,DOMFromString,xpath } from "pitaka/xmlparser";
import {getFormat} from "pitaka/format"
import { filesFromPattern, nodefs, readTextContent, writeChanged } from "pitaka/cli";
import {getVols} from "./bookcode.js";
import {autoChineseBreak} from "pitaka/utils"

await nodefs;
const rootdir='N/';
const desfolder='off/';
const bookcode=process.argv[2]||"dn1"
const folders=getVols(bookcode).map(v=>'N'+v +'/*') ;
const files=filesFromPattern( folders,'N');
const cbeta=getFormat("cbeta");
const {g}=cbeta.onOpen;
const ctx={started:false,hide:0,isheader:true,header:'',paratext:'', lb:'' };

const bkpf=bookcode.replace(/\d+$/,'');
const pnjson=JSON.parse(readTextContent('cst4pn/'+bkpf+'.json'));
let bkid=''; //currently output bkid; take from pnjson ^bk
let lines=[];
const onText=(str,ctx)=>{
    if (!ctx.hide && ctx.started) {
        let t=str.trim();
        if (ctx.isheader && t) {
            if (ctx.mululevel) {
                ctx.header+='^z'+ctx.mululevel+'['+t+']';
                ctx.mululevel=0;
            } else {
                // ctx.header+='^h['+t+']';
            }
        }
        else ctx.paratext+=t;
    }
}
const parseHook=(str,hook)=>{
    return hook;//number now
}
const onOpen={
    g,
    note:(el,ctx)=>ctx.hide++,
    milestone:(el,ctx)=>{ctx.started=true;},
    'pb':(el,ctx)=>{
        ctx.vol=el.attrs['xml:id'].substr(1,2);
    },
    'p':(el,ctx)=>{
        if (el.attrs["cb:place"]=="inline") {
            ctx.paratext+='§';
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
            insertpoint=parseHook(ctx.paratext, insert[1]);
            insert=insert[0];
            if (insertpoint) insert='\n'+insert;
        }

        const text=ctx.paratext.substr(0,insertpoint)
            +(insert?insert:'')
            +ctx.paratext.substr(insertpoint);
    
            const m=insert&&insert.match(/\^bk#([a-z\d]+)/);
        if(m) {
            writeOutput();
            bkid=m[1];
        }
        if (text) {
            //make ^bk and ^n1 in same line
            const newline=((insert||'').indexOf("^n1 ")===-1 && !insertpoint)?"\n":"";
            lines.push( ((insert&&ctx.paratext)?newline+ctx.header:"")+text );
            if (insert&&ctx.paratext) ctx.header='';
            ctx.paratext='';
        }
    }
}
const onClose={
    note:(el,ctx)=>ctx.hide--,
    'cb:mulu':(el,ctx)=>{ctx.isheader=false},
    'head':(el,ctx)=>{ctx.isheader=false},
    'body':()=>{ctx.started=false}
};
const writeOutput=()=>{
    // lines=lines.map(autoChineseBreak);
    if (bkid && writeChanged(desfolder+bkid+'.off.gen',lines.join(''))) {
        console.log('written',bkid,lines.length);
    }
    bkid='';
    lines=[];
}


files.forEach(file=>{
    const buf=fs.readFileSync(rootdir+file,'utf8');
    const el=DOMFromString(buf);
    const body=xpath(el,'text/body');
    ctx.charmap=cbeta.buildCharmap(xpath(el,'teiHeader/encodingDesc/charDecl'));
    walkDOMOfftext(body,ctx,onOpen, onClose,onText).trim();
});
writeOutput();