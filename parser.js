import {posPin,fromChineseNumber} from 'ptk/nodebundle.cjs';

export const onText=(str,ctx)=>{
    if (!ctx.hide && ctx.started) {
        let t=str.trim();
        if (ctx.isnote) {
            ctx.notetext+=t;
        } else if (ctx.isheader && t) {
            if (ctx.mululevel) {
                ctx.header+='^z'+ctx.mululevel+'('+t+')';
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

const applyInserts=(lb,ctx)=>{
    let text=ctx.paratext, count=0,insertpoint=0;
    let newpara=false;
    while (true) {
        let insert=ctx.pnjson[lb+(count?'+'+count:'')];
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

        text=text.substring(0,insertpoint)
            +(insert?insert:'')
            +text.substring(insertpoint);

    }
    return [text,newpara];
}

export const onOpen={
    g:(el,ctx)=>{
        const uni=ctx.charmap[el.attrs.ref.slice(1)]
        if (uni) ctx.paratext+=uni;
        else {
            ctx.paratext+'^mc'+el.attrs.ref.slice(3);
            ctx.compact=true;
        }
    },
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
    'rdg':(el,ctx) =>ctx.hide=true,
    'p':(el,ctx)=>{
        if (el.attrs["cb:place"]=="inline") {
            //might have note maker after , see pN06p0204a1301
            const cn=ctx.paratext.match(/([一二三四五六七八九十百千○〇]+[⚓\d]*)$/);
            if (cn) {
                ctx.paratext=ctx.paratext.substr(0,ctx.paratext.length-cn[1].length);
                ctx.paratext+='^m'+fromChineseNumber(cn[1]);
                ctx.compact=true;
            }
        } else { //for CB-N
            const id=el.attrs["xml:id"];
            if (id) {
                ctx.paratext+='\n';//^p'+id.slice(2);
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
        let lbnow=ctx.pnjson[ctx.lb];
        let insert=ctx.pnjson[prevlb];
        if (!insert&&!lbnow) return;
        if (lbnow && typeof lbnow!=='string') lbnow=lbnow[0];
        
        let [text,newpara]=applyInserts(prevlb,ctx);

        const m=insert&&typeof insert==='string' &&insert.match(/\^bk#([a-z\d]+)/);
        if(m) {
            if(ctx.bkid) ctx.writeOutput();
            ctx.bkid=m[1];
        }

        if (text) {
            ctx.outcontent += (newpara?"\n"+ctx.header:'')+text ;
            if (newpara) ctx.header='';
            ctx.paratext='';
        }
    }
}
export const onClose={
   
    note:(el,ctx)=>{
        if (!ctx.hide)  {
            if (el.attrs.type=='star') ctx.notetext+='★'
            ctx.notes.push([-1,0,ctx.notetext]); //y, pin, val
            const notetag='⚓'+ctx.notes.length;
            if (ctx.isheader) {
                ctx.header+=notetag;
            } else if (ctx.paratext) {
                ctx.paratext+=notetag;
            }    
            ctx.compact=true;
        }

        ctx.notetext='';
        ctx.isnote=false;
    },
    'rdg':(el,ctx) =>ctx.hide=false,
    'cb:mulu':(el,ctx)=>{ctx.isheader=false},
    'head':(el,ctx)=>{ctx.isheader=false},
    'body':(el,ctx)=>{ctx.started=false}
};