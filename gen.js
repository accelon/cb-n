import {meta_cbeta,walkDOMOfftext,DOMFromString,xpath, filesFromPattern, nodefs, aligncrlf,
    readTextContent, readTextLines, writeChanged ,patchBuf,autoChineseBreak,autoAlign, combineHeaders} from 'ptk/nodebundle.cjs';
import {red} from 'ptk/cli/colors.cjs'
import {getVols} from './bookcode.js';
import Errata from './errata.js';
import {onOpen,onClose,onText} from './parser.js'
await nodefs;
const rootdir='N/';
const guidefolder='./off/'
const bookcode=process.argv[2]||"dn"
const folders=getVols(bookcode).map(v=>'N'+v +'/*') ;
const files=filesFromPattern( folders,'N');
console.log('node gen filepat [p]');
let paramode=process.argv[3]==='p';
const desfolder=paramode?'par/':'off-ori/';
const bkpf=bookcode.replace(/\d+$/,'');

const ctx={onText,started:false,hide:0,isheader:true,header:'',paratext:'', lb:'', notes:[], outcontent:'',bkid:''};
ctx.pnjson=JSON.parse(readTextContent('inserts/'+bkpf+'.json').replace(/\/\/.+/g,''));

const replaceNoteMarker=(lines,opts={})=>{
    const marker=opts.marker||'⚓';
    const regex=new RegExp(marker+'([0-9]+)','g');
    for (let i=0;i<lines.length;i++) {
        let line=lines[i].replace(regex,(m,m1)=>{
            return '^f'+m1+'<>';
        })
        lines[i]=line.replace(/<>[ \da-zA-Z#_@~]/g,' ').replace(/<>/g,'');
    }
    return lines;
}
ctx.writeOutput=()=>{
    if (!ctx.outcontent.length||!ctx.bkid)return;
    ctx.outcontent= ctx.outcontent.replace(/\n\n\^n/g,'\n^n');

    let lines=ctx.outcontent.trimStart().split(/\r?\n/);   
    const guidefile=guidefolder+ctx.bkid+'.yh.off';
   
    const guidecontent=readTextContent(guidefile);
    const guidelines=guidecontent.split('\n');
    if (!paramode) {
        lines=aligncrlf(lines.join('\n'), guidecontent);
    }

    //lines=stripNotes(lines,ctx);  pin note
    lines=replaceNoteMarker(lines);

    ctx.outcontent=lines.join('\n');
    const outfn=desfolder+ctx.bkid+'.yh.off'
    const linecountwarning=lines.length!==guidelines?.length?red("!="+guidelines?.length):'';
    if (ctx.bkid && writeChanged(outfn,ctx.outcontent)) {
        console.log('written',outfn,lines.length,linecountwarning);
    } else {
        console.log('same',outfn,lines.length,linecountwarning);
    }

    //const noteout='['+ctx.notes.map( ([y,pin,val]) =>JSON.stringify({y,pin,val})).join(",\n")+']';
    const noteout=ctx.notes.map( (it,idx)=>{
        return (idx+1)+'\t'+it[1];
    });
    noteout.unshift('^:<name='+ctx.bkid+' footnote=bk>\tnote');
    ctx.bkid && writeChanged(desfolder+ctx.bkid+'.yh.tsv',noteout.join('\n'),true)
    
    ctx.bkid='';
    ctx.notes=[];
    ctx.outcontent='';
}


files.forEach(file=>{
    const buf=meta_cbeta.tidy(patchBuf(readTextContent(rootdir+file),Errata[file],file));
    
    const el=DOMFromString(buf);
    const body=xpath(el,'text/body');
    ctx.charmap=meta_cbeta.buildCharMap(el);
    walkDOMOfftext(body,ctx,onOpen, onClose).trim();
});

ctx.writeOutput();
// writeChanged(bkpf+'.json.new',JSON.stringify(pnjson,'',' '))