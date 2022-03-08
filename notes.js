import {pinPos} from 'pitaka/align'
import {stripLinesNote} from 'pitaka/utils'
import { linePN } from 'pitaka/offtext';
export const stripNotes=(lines,ctx)=>{
    const notes=ctx.notes;
    const NoteIdx={};
    notes.forEach( (note,idx)=>{
        NoteIdx[idx+1]=note; //nid is one base, see parser.js::onClose note()
    });
    lines=stripLinesNote(lines,NoteIdx);

    notes.forEach(note=>{
        const [y,x]=note;
        if (y<0) return;
        const pn=linePN(lines[y]);
        if (pn && x<pn.index+pn[0].length) {
            note[1]='';
        } else {
            note[1]=pinPos( lines[y], x ,{backward:true,cjk:true,offtext:true});
        }
    })
    ctx.notes=notes.filter(it=>it[0]>=0); //remove the notes which cannot be resolve
    /* N06n0004_001.xml <note n="0031a0901" resp="CBETA" type="add"> */
    return lines   
}