export const BookPrefix={
    vin:"pj,pc,mv,cv,pvr",
    ab:"ds,dt,kv,pt,pp,vb,ya",
    kn:"dhp,iti,ud,thag,thig"
}
export const volOfBook={//6-8 DN, 9-12 MN,  13-18 SN, 19-25 AN
    pc:1,pc:2,mv:3,cv:4,pvr:5,
    dn:[6,7,8],
    dn1:6,// cross multiple vols, just for testing
    mn:[9,10,11,12],
    sn:[13,14,15,16,17,18],
    an:[19,20,21,22,23,24,25],
    kp:26,dhp:26,ud:26,iti:26, //小誦 法句 自說 如是語
    snp:27,vv:27,//經集 天宮
    pv:28,thag:28,thig:28,//餓鬼 長老偈 長老尼偈
    ap:[29,30],//譬喻
    ja:[31,32,33,34,35,36,37,38,39,40,41,42],//本生
    ps:[43,44],//無礙解道
    bv:44,cp:44,//佛種性，所行藏
    mnd:[45,46],cnd:47,//大義釋 小義釋
    ds:48,//法集
    vb:[49,50],//分別
    dt:50,//界論
    pp:50,//人施設
    ya:[51,52,53],//雙論
    pt:[54,55,56,57,58,59,60],//發趣
    kt:[61,62],//論事
    mil:[63,64],//彌蘭王問經
    dvm:65, mvm:65, cvm :66,//島王統史 大王統史  66小王統史
    vs:[67,68,69],//清淨道論 
    abhs:70,//攝阿毘達磨義論
}

export const getVols=pat=>{
    let vols=volOfBook[pat];
    if (!vols) throw 'invalid bookcode '+pat;
    if (typeof vols==='number') vols=[vols];
    return vols.map(v=>v.toString().padStart(2,'0'));
}