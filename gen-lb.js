import { walkDOMOfftext,DOMFromString,xpath,onOfftext } from "pitaka/xmlparser";
import {getFormat} from "pitaka/format"
import { filesFromPattern, nodefs, writeChanged } from "pitaka/cli";
await nodefs;
const rootdir='N/';
const pat=process.argv[2]||"N06/*"
const files=filesFromPattern(pat,'N');
const cbeta=getFormat("cbeta");

const {g}=cbeta.onOpen;
const ctx={hide:0};

const onText=(str,ctx)=>{
    // if(str) console.log(ctx.hide,str.substr(0,10));
    return onOfftext(str,ctx);
}
const onOpen={
    g,
    note:(el,ctx)=>ctx.hide++,
    milestone:(el,ctx)=>{ctx.started=true;},
    'pb':(el,ctx)=>{
        ctx.vol=el.attrs['xml:id'].substr(1,2);
    },
    'p':(el,ctx)=>{
        if (el.attrs["cb:place"]=="inline") return '※';
    },
}
const onClose={
    note:(el,ctx)=>ctx.hide--,
    'lb':(el,ctx)=>{
        const lb=ctx.lb;
        ctx.lb=ctx.vol+'p'+el.attrs.n;
        if (lb&&lb.trim()) return '\t'+lb+'\n';
    },
};
const lines=[];
files.forEach(file=>{
    const buf=fs.readFileSync(rootdir+file,'utf8');
    const el=DOMFromString(buf);
    const body=xpath(el,'text/body');
    ctx.charmap=cbeta.buildCharmap(xpath(el,'teiHeader/encodingDesc/charDecl'));
    ctx.started=false ;//hide text until milestone
    const out=walkDOMOfftext(el,ctx,onOpen, onClose,onText);
    lines.push(out)
});
const buf=lines.join('\n');
if (writeChanged('cb-n.txt',buf)){
    console.log('written',buf.length)
}
