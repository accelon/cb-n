import {cbeta, walkDOMOfftext,DOMFromString,xpath,
    filesFromPattern, nodefs, writeChanged } from "ptk/nodebundle.cjs";
await nodefs;
const rootdir='N/';
const pat=process.argv[2]||"N0[6789]/*,N1?/*,N2[01234567]/*"
const files=filesFromPattern(pat,'N');

const {g}=cbeta.onOpen;
const onText=(t,ctx,started)=>{
    if (!started) return ''
    return t.trim();
}
const ctx={hide:0,onText,out:''};

const onOpen={
    g,
    note:(el,ctx)=>{
        ctx.hide++;
        return ''
    },
    milestone:(el,ctx)=>{ctx.started=true;},
    'pb':(el,ctx)=>{
        ctx.vol=el.attrs['xml:id'].substr(1,2);
    },
    'p':(el,ctx)=>{
        if (el.attrs["cb:place"]=="inline") return '§';
    },

}
const onClose={
    note:(el,ctx)=>ctx.hide--,
    'lb':(el,ctx)=>{
        // const lb=ctx.lb;
        const lb=ctx.vol+'p'+el.attrs.n;
        if (lb&&lb.trim()) return '\n'+lb+'|';
    },
};
const lines=[];
files.forEach(file=>{
    process.stdout.write('\r'+file+'   ');
    const buf=fs.readFileSync(rootdir+file,'utf8');
    const el=DOMFromString(buf);
    const body=xpath(el,'text/body');
    ctx.charmap=cbeta.buildCharmap(xpath(el,'teiHeader/encodingDesc/charDecl'));
    ctx.started=false ;//hide text until milestone
    walkDOMOfftext(body,ctx,onOpen, onClose);
    lines.push(ctx.out.trim());
    ctx.out=''
});
const buf=lines.join('\n');
writeChanged('cb-n.txt',buf,true);
