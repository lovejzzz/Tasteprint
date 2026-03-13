import React, { useState, useRef, useCallback, useEffect } from "react";

const STORE_KEY = "tasteprint";
function load(k,d){try{const s=JSON.parse(localStorage.getItem(STORE_KEY)||"{}");return s[k]!==undefined?s[k]:d}catch{return d}}

const FONTS = [
  {name:"DM Sans",family:"'DM Sans',system-ui,sans-serif"},
  {name:"Inter",family:"'Inter',system-ui,sans-serif"},
  {name:"Plus Jakarta Sans",family:"'Plus Jakarta Sans',system-ui,sans-serif"},
  {name:"Manrope",family:"'Manrope',system-ui,sans-serif"},
  {name:"Space Grotesk",family:"'Space Grotesk',system-ui,sans-serif"},
  {name:"Outfit",family:"'Outfit',system-ui,sans-serif"},
  {name:"Sora",family:"'Sora',system-ui,sans-serif"},
  {name:"Work Sans",family:"'Work Sans',system-ui,sans-serif"},
  {name:"Figtree",family:"'Figtree',system-ui,sans-serif"},
  {name:"Instrument Serif",family:"'Instrument Serif',Georgia,serif"},
];

const PAL = {
  warm:  { bg:"#FFF8F2",card:"#FFFFFF",ac:"#E07A5F",ac2:"#F2B880",tx:"#3D2C2C",mu:"#9C8578",bd:"rgba(224,122,95,0.12)",su:"#FDF0E8",name:"Warm" },
  cool:  { bg:"#F4F7FB",card:"#FFFFFF",ac:"#5B8DB8",ac2:"#7CAED4",tx:"#2C3644",mu:"#7A8B9C",bd:"rgba(91,141,184,0.12)",su:"#EBF2F8",name:"Cool" },
  earth: { bg:"#F7F4F0",card:"#FFFFFF",ac:"#8C7B6C",ac2:"#B8A08C",tx:"#3D3630",mu:"#A09488",bd:"rgba(140,123,108,0.12)",su:"#F0ECE6",name:"Earth" },
  noir:  { bg:"#1A1A1E",card:"#242428",ac:"#FFFFFF",ac2:"#888890",tx:"#F0F0F2",mu:"#78787E",bd:"rgba(255,255,255,0.08)",su:"#2A2A2E",name:"Noir" },
  candy: { bg:"#FFF5F9",card:"#FFFFFF",ac:"#E8589C",ac2:"#A864D4",tx:"#3A2434",mu:"#A88898",bd:"rgba(232,88,156,0.12)",su:"#FDE8F2",name:"Candy" },
};

const VARIANTS = {
  button:    ["Filled","Outline","Ghost","Pill","Brutal"],
  card:      ["Elevated","Outlined","Filled bg","Top media","Minimal"],
  "card-sm": ["Rounded","Horizontal","Tinted"],
  hero:      ["Gradient","Centered","Bold fill"],
  navbar:    ["Classic","Underline","Pill"],
  tabs:      ["Segmented","Underline","Pill chips"],
  heading:   ["Clean","Accent bar","Overline"],
  "stat-card":["Outlined","Tinted icon","Left accent","Inverted"],
  "image-placeholder":["Subtle","Gradient","Dashed"],
  "avatar-row":["Circular","Small tight","Rounded sq"],
  "list-item":["Card row","Divider","Tinted"],
  input:     ["Outlined","Labeled","Filled"],
  search:    ["Bordered","Pill kbd","Underline"],
  toggle:    ["Round","Square"],
  badge:     ["Tinted","Solid","Outline"],
  toast:     ["Card","Dark snack","Accent bar"],
  progress:  ["Round","Flat","Thin"],
};

const LIB = [
  { cat:"Structure", items:[
    {type:"card",label:"Card",w:280,h:200},
    {type:"card-sm",label:"Small card",w:200,h:130},
    {type:"hero",label:"Hero",w:480,h:210},
  ]},
  { cat:"Navigation", items:[
    {type:"navbar",label:"Nav bar",w:480,h:52},
    {type:"tabs",label:"Tabs",w:300,h:42},
  ]},
  { cat:"Content", items:[
    {type:"heading",label:"Heading",w:260,h:44},
    {type:"stat-card",label:"Stat card",w:160,h:110},
    {type:"image-placeholder",label:"Image",w:240,h:150},
    {type:"avatar-row",label:"Avatars",w:150,h:40},
    {type:"list-item",label:"List item",w:300,h:60},
  ]},
  { cat:"Input", items:[
    {type:"button",label:"Button",w:148,h:44},
    {type:"input",label:"Text input",w:248,h:44},
    {type:"search",label:"Search",w:270,h:44},
    {type:"toggle",label:"Toggle",w:48,h:28},
  ]},
  { cat:"Feedback", items:[
    {type:"badge",label:"Badge",w:72,h:28},
    {type:"toast",label:"Toast",w:290,h:56},
    {type:"progress",label:"Progress",w:220,h:8},
  ]},
];

function uid(){return Math.random().toString(36).substr(2,9)}
function maxV(t){return(VARIANTS[t]||[]).length||1}
function varName(t,v){return(VARIANTS[t]||[])[v]||"Default"}

function snap(s,all,thr=10){
  const r={x:null,y:null,g:[]}, cx=s.x+s.w/2, cy=s.y+s.h/2;
  for(const o of all){
    if(o.id===s.id)continue;
    const ox=o.x+o.w/2,oy=o.y+o.h/2;
    if(Math.abs(cx-ox)<thr){r.x=ox-s.w/2;r.g.push({t:"v",p:ox})}
    if(Math.abs(cy-oy)<thr){r.y=oy-s.h/2;r.g.push({t:"h",p:oy})}
    if(Math.abs(s.x-o.x)<thr){r.x=o.x;r.g.push({t:"v",p:o.x})}
    if(Math.abs(s.x+s.w-(o.x+o.w))<thr){r.x=o.x+o.w-s.w;r.g.push({t:"v",p:o.x+o.w})}
    if(Math.abs(s.y-o.y)<thr){r.y=o.y;r.g.push({t:"h",p:o.y})}
    if(Math.abs(s.y+s.h-(o.y+o.h))<thr){r.y=o.y+o.h-s.h;r.g.push({t:"h",p:o.y+o.h})}
    for(const g of[12,16,24]){
      if(Math.abs(s.x-(o.x+o.w)-g)<thr){r.x=o.x+o.w+g;r.g.push({t:"v",p:o.x+o.w+g/2})}
      if(Math.abs(s.y-(o.y+o.h)-g)<thr){r.y=o.y+o.h+g;r.g.push({t:"h",p:o.y+o.h+g/2})}
    }
  }
  return r;
}

function Radar({taste,ac}){
  const d=[{k:"density",l:"Dense"},{k:"roundness",l:"Round"},{k:"warmth",l:"Warm"},{k:"complexity",l:"Rich"},{k:"boldness",l:"Bold"}];
  const n=d.length,cx=50,cy=50,R=36;
  const pts=d.map((dm,i)=>{const a=(Math.PI*2*i)/n-Math.PI/2;const v=taste[dm.k]||0;return{x:cx+Math.cos(a)*R*v,y:cy+Math.sin(a)*R*v,lx:cx+Math.cos(a)*(R+13),ly:cy+Math.sin(a)*(R+13),l:dm.l}});
  return(<svg width="100" height="100" viewBox="0 0 100 100">
    {[.33,.66,1].map((s,i)=><polygon key={i} points={d.map((_,j)=>{const a=(Math.PI*2*j)/n-Math.PI/2;return`${cx+Math.cos(a)*R*s},${cy+Math.sin(a)*R*s}`}).join(" ")} fill="none" stroke="rgba(128,128,128,0.1)" strokeWidth="0.5"/>)}
    <polygon points={pts.map(p=>`${p.x},${p.y}`).join(" ")} fill={ac+"18"} stroke={ac} strokeWidth="1.5" strokeLinejoin="round"/>
    {pts.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r="2.5" fill={ac}/>)}
    {pts.map((p,i)=><text key={`l${i}`} x={p.lx} y={p.ly} textAnchor="middle" dominantBaseline="central" fontSize="6.5" fill="rgba(128,128,128,0.5)" fontFamily="system-ui">{p.l}</text>)}
  </svg>);
}

/* ========== COMPONENT RENDERER ========== */
function C({type,v=0,p,editable,texts={},onText,font=0}){
  const f=FONTS[font]?.family||FONTS[0].family;
  const b={width:"100%",height:"100%",fontFamily:f,overflow:"hidden"};

  /* Editable text helper — renders plain span unless editable */
  const T=({k,s,children})=>{
    const val=texts[k]!==undefined?texts[k]:children;
    if(!editable)return <span style={s}>{val}</span>;
    return <span
      contentEditable
      suppressContentEditableWarning
      onBlur={e=>{const t=e.target.innerText.trim();onText?.(k,t||null)}}
      onMouseDown={e=>e.stopPropagation()}
      onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();e.target.blur()}}}
      style={{...s,outline:"none",cursor:"text",minWidth:8}}
    >{val}</span>;
  };

  /* ---- BUTTON ---- */
  if(type==="button"){
    if(v===0)return <div style={{...b,background:p.ac,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center"}}><T k="label" s={{color:"#fff",fontSize:13,fontWeight:500}}>Get started</T></div>;
    if(v===1)return <div style={{...b,background:"transparent",borderRadius:10,border:`1.5px solid ${p.ac}55`,display:"flex",alignItems:"center",justifyContent:"center"}}><T k="label" s={{color:p.ac,fontSize:13,fontWeight:500}}>Learn more</T></div>;
    if(v===2)return <div style={{...b,background:"transparent",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center"}}><T k="label" s={{color:p.ac,fontSize:13,fontWeight:500}}>Learn more</T></div>;
    if(v===3)return <div style={{...b,background:p.ac,borderRadius:999,display:"flex",alignItems:"center",justifyContent:"center"}}><T k="label" s={{color:"#fff",fontSize:13,fontWeight:500}}>Get started</T></div>;
    return <div style={{...b,background:p.tx,borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",border:`2px solid ${p.tx}`}}><T k="label" s={{color:p.bg,fontSize:13,fontWeight:600,letterSpacing:"0.04em"}}>SUBMIT</T></div>;
  }

  /* ---- CARD ---- */
  if(type==="card"){
    const skel=(w)=><div style={{height:8,width:w,background:p.mu,opacity:.1,borderRadius:4}}/>;
    if(v===0)return <div style={{...b,background:p.card,borderRadius:14,boxShadow:`0 2px 12px ${p.tx}08, 0 0 0 1px ${p.bd}`,padding:20,display:"flex",flexDirection:"column",gap:10}}><div style={{width:36,h:36,height:36,borderRadius:10,background:p.su}}/>{skel("55%")}{skel("85%")}{skel("70%")}<div style={{marginTop:"auto",height:34,borderRadius:8,background:p.ac,opacity:.08}}/></div>;
    if(v===1)return <div style={{...b,background:p.card,borderRadius:12,border:`1px solid ${p.bd}`,padding:20,display:"flex",flexDirection:"column",gap:10}}><div style={{width:36,height:36,borderRadius:10,background:p.su}}/>{skel("55%")}{skel("85%")}{skel("70%")}<div style={{marginTop:"auto",height:34,borderRadius:8,border:`1.5px solid ${p.ac}33`}}/></div>;
    if(v===2)return <div style={{...b,background:p.su,borderRadius:16,padding:22,display:"flex",flexDirection:"column",gap:10}}><div style={{width:40,height:40,borderRadius:999,background:p.ac+"18",display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{width:18,height:18,borderRadius:999,background:p.ac,opacity:.35}}/></div>{skel("50%")}{skel("80%")}<div style={{marginTop:"auto",height:36,borderRadius:10,background:p.ac,opacity:.1}}/></div>;
    if(v===3)return <div style={{...b,background:p.card,borderRadius:14,border:`1px solid ${p.bd}`,overflow:"hidden",display:"flex",flexDirection:"column"}}><div style={{height:"42%",background:p.su}}/><div style={{padding:16,display:"flex",flexDirection:"column",gap:6,flex:1}}>{skel("50%")}{skel("80%")}</div></div>;
    return <div style={{...b,background:p.card,borderRadius:12,padding:20,display:"flex",flexDirection:"column",gap:10}}>{skel("55%")}{skel("90%")}{skel("70%")}{skel("50%")}</div>;
  }

  /* ---- CARD-SM ---- */
  if(type==="card-sm"){
    if(v===0)return <div style={{...b,background:p.card,borderRadius:14,border:`1px solid ${p.bd}`,padding:14,display:"flex",flexDirection:"column",gap:8}}><div style={{width:28,height:28,borderRadius:8,background:p.su}}/><div style={{height:9,width:"60%",background:p.su,borderRadius:4}}/><div style={{height:7,width:"80%",background:p.su,borderRadius:4}}/></div>;
    if(v===1)return <div style={{...b,background:p.card,borderRadius:12,border:`1px solid ${p.bd}`,padding:14,display:"flex",gap:12,alignItems:"center"}}><div style={{width:44,height:44,borderRadius:10,background:p.su,flexShrink:0}}/><div style={{flex:1,display:"flex",flexDirection:"column",gap:5}}><div style={{height:9,width:"65%",background:p.su,borderRadius:4}}/><div style={{height:7,width:"90%",background:p.su,borderRadius:3}}/></div></div>;
    return <div style={{...b,background:p.su,borderRadius:16,padding:14,display:"flex",flexDirection:"column",gap:8}}><div style={{width:30,height:30,borderRadius:999,background:p.ac+"1A"}}/><div style={{height:9,width:"55%",background:p.ac,opacity:.12,borderRadius:5}}/><div style={{height:7,width:"75%",background:p.mu,opacity:.08,borderRadius:4}}/></div>;
  }

  /* ---- HERO ---- */
  if(type==="hero"){
    if(v===0)return <div style={{...b,background:`linear-gradient(135deg,${p.ac}12,${p.ac2}12)`,borderRadius:16,border:`1px solid ${p.bd}`,padding:32,display:"flex",flexDirection:"column",justifyContent:"center",gap:12}}><div style={{height:14,width:"42%",background:p.ac,opacity:.15,borderRadius:7}}/><div style={{height:9,width:"70%",background:p.mu,opacity:.1,borderRadius:5}}/><div style={{display:"flex",gap:10,marginTop:8}}><div style={{height:38,width:110,borderRadius:9,background:p.ac,display:"flex",alignItems:"center",justifyContent:"center"}}><T k="cta" s={{color:"#fff",fontSize:12,fontWeight:500}}>Get started</T></div><div style={{height:38,width:95,borderRadius:9,border:`1.5px solid ${p.ac}44`,display:"flex",alignItems:"center",justifyContent:"center"}}><T k="cta2" s={{color:p.ac,fontSize:12,fontWeight:500}}>Learn more</T></div></div></div>;
    if(v===1)return <div style={{...b,background:p.card,borderRadius:4,border:`1px solid ${p.bd}`,padding:"36px 32px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:10,textAlign:"center"}}><div style={{height:13,width:"32%",background:p.tx,opacity:.55,borderRadius:2}}/><div style={{height:8,width:"50%",background:p.mu,opacity:.12,borderRadius:2}}/><div style={{height:36,width:120,borderRadius:3,background:p.tx,marginTop:12,display:"flex",alignItems:"center",justifyContent:"center"}}><T k="cta" s={{color:p.bg,fontSize:12,fontWeight:500}}>Start now</T></div></div>;
    return <div style={{...b,background:p.ac,borderRadius:20,padding:36,display:"flex",flexDirection:"column",justifyContent:"center",gap:12}}><div style={{height:14,width:"45%",background:"#fff",opacity:.25,borderRadius:7}}/><div style={{height:9,width:"65%",background:"#fff",opacity:.15,borderRadius:5}}/><div style={{height:38,width:115,borderRadius:999,background:"#fff",marginTop:10,display:"flex",alignItems:"center",justifyContent:"center"}}><T k="cta" s={{color:p.ac,fontSize:12,fontWeight:600}}>Get started</T></div></div>;
  }

  /* ---- NAVBAR ---- */
  if(type==="navbar"){
    const dl=["Home","Features","Pricing"];
    const links=[texts.link0||dl[0],texts.link1||dl[1],texts.link2||dl[2]];
    if(v===0)return <div style={{...b,background:p.card,borderRadius:12,border:`1px solid ${p.bd}`,padding:"0 18px",display:"flex",alignItems:"center",justifyContent:"space-between"}}><div style={{display:"flex",alignItems:"center",gap:16}}><div style={{width:20,height:20,borderRadius:6,background:p.ac,opacity:.6}}/>{dl.map((t,i)=><T key={i} k={`link${i}`} s={{fontSize:12,color:i===0?p.tx:p.mu,fontWeight:i===0?500:400}}>{t}</T>)}</div><div style={{height:30,width:74,borderRadius:8,background:p.ac,display:"flex",alignItems:"center",justifyContent:"center"}}><T k="cta" s={{color:"#fff",fontSize:11,fontWeight:500}}>Sign up</T></div></div>;
    if(v===1)return <div style={{...b,borderBottom:`1.5px solid ${p.bd}`,padding:"0 18px",display:"flex",alignItems:"center",justifyContent:"space-between"}}><div style={{display:"flex",alignItems:"center",gap:20}}><T k="brand" s={{fontSize:14,fontWeight:600,color:p.tx,letterSpacing:"-0.02em"}}>Brand</T>{dl.map((t,i)=><T key={i} k={`link${i}`} s={{fontSize:12,color:p.mu}}>{t}</T>)}</div><div style={{height:30,width:70,borderRadius:4,border:`1.5px solid ${p.tx}`,display:"flex",alignItems:"center",justifyContent:"center"}}><T k="cta" s={{color:p.tx,fontSize:11,fontWeight:500}}>Log in</T></div></div>;
    return <div style={{...b,background:p.su,borderRadius:999,padding:"0 5px 0 18px",display:"flex",alignItems:"center",justifyContent:"space-between"}}><div style={{display:"flex",alignItems:"center",gap:14}}><div style={{width:18,height:18,borderRadius:999,background:p.ac,opacity:.5}}/>{dl.map((t,i)=><T key={i} k={`link${i}`} s={{fontSize:12,color:i===0?p.tx:p.mu,fontWeight:i===0?500:400}}>{t}</T>)}</div><div style={{height:34,width:78,borderRadius:999,background:p.ac,display:"flex",alignItems:"center",justifyContent:"center"}}><T k="cta" s={{color:"#fff",fontSize:11,fontWeight:500}}>Contact</T></div></div>;
  }

  /* ---- TABS ---- */
  if(type==="tabs"){
    const dt=["Overview","Analytics","Reports"];
    if(v===0)return <div style={{...b,background:p.su,borderRadius:10,padding:3,display:"flex",gap:2,alignItems:"center"}}>{dt.map((t,i)=><div key={i} style={{flex:1,height:"calc(100% - 2px)",borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",background:i===0?p.card:"transparent",boxShadow:i===0?"0 1px 3px rgba(0,0,0,0.04)":"none"}}><T k={`tab${i}`} s={{fontSize:12,fontWeight:i===0?500:400,color:i===0?p.tx:p.mu}}>{t}</T></div>)}</div>;
    if(v===1)return <div style={{...b,borderBottom:`2px solid ${p.bd}`,display:"flex",gap:24,alignItems:"stretch",padding:"0 4px"}}>{dt.map((t,i)=><div key={i} style={{display:"flex",alignItems:"center",borderBottom:i===0?`2px solid ${p.ac}`:"2px solid transparent",marginBottom:-2}}><T k={`tab${i}`} s={{fontSize:12,fontWeight:i===0?500:400,color:i===0?p.ac:p.mu}}>{t}</T></div>)}</div>;
    return <div style={{...b,display:"flex",gap:6,alignItems:"center"}}>{dt.map((t,i)=><div key={i} style={{padding:"6px 14px",borderRadius:999,background:i===0?p.ac+"14":"transparent"}}><T k={`tab${i}`} s={{fontSize:12,fontWeight:i===0?500:400,color:i===0?p.ac:p.mu}}>{t}</T></div>)}</div>;
  }

  /* ---- HEADING ---- */
  if(type==="heading"){
    if(v===0)return <div style={{...b,display:"flex",alignItems:"flex-end"}}><T k="title" s={{fontSize:22,fontWeight:600,color:p.tx,letterSpacing:"-0.02em"}}>Page heading</T></div>;
    if(v===1)return <div style={{...b,display:"flex",alignItems:"flex-end",gap:10}}><div style={{width:4,height:24,borderRadius:2,background:p.ac}}/><T k="title" s={{fontSize:20,fontWeight:600,color:p.tx}}>Page heading</T></div>;
    return <div style={{...b,display:"flex",flexDirection:"column",justifyContent:"flex-end",gap:3}}><T k="over" s={{fontSize:10,fontWeight:600,color:p.ac,textTransform:"uppercase",letterSpacing:"0.1em"}}>Section</T><T k="title" s={{fontSize:20,fontWeight:500,color:p.tx}}>Page heading</T></div>;
  }

  /* ---- STAT-CARD ---- */
  if(type==="stat-card"){
    if(v===0)return <div style={{...b,background:p.card,borderRadius:12,border:`1px solid ${p.bd}`,padding:14,display:"flex",flexDirection:"column",justifyContent:"space-between"}}><T k="label" s={{fontSize:10,color:p.mu,fontWeight:500,textTransform:"uppercase",letterSpacing:"0.05em"}}>Revenue</T><T k="value" s={{fontSize:26,fontWeight:600,color:p.tx,letterSpacing:"-0.02em"}}>$48.2k</T><T k="delta" s={{fontSize:11,color:"#4CAF50",fontWeight:500}}>+12.5%</T></div>;
    if(v===1)return <div style={{...b,background:p.su,borderRadius:14,padding:14,display:"flex",flexDirection:"column",justifyContent:"space-between"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><T k="label" s={{fontSize:10,color:p.mu,fontWeight:500}}>Revenue</T><div style={{width:28,height:28,borderRadius:999,background:p.ac+"14",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:12,color:p.ac}}>$</span></div></div><T k="value" s={{fontSize:24,fontWeight:600,color:p.tx}}>$48.2k</T><div style={{height:4,borderRadius:2,background:p.ac+"1A"}}><div style={{width:"68%",height:"100%",borderRadius:2,background:p.ac,opacity:.5}}/></div></div>;
    if(v===2)return <div style={{...b,background:p.card,borderRadius:4,borderLeft:`3px solid ${p.ac}`,padding:14,display:"flex",flexDirection:"column",justifyContent:"space-between"}}><T k="label" s={{fontSize:10,color:p.mu,fontWeight:500}}>REVENUE</T><T k="value" s={{fontSize:28,fontWeight:600,color:p.tx}}>$48.2k</T><T k="delta" s={{fontSize:11,color:"#4CAF50",fontWeight:500}}>+12.5% vs prev</T></div>;
    return <div style={{...b,background:p.ac,borderRadius:14,padding:14,display:"flex",flexDirection:"column",justifyContent:"space-between"}}><T k="label" s={{fontSize:10,color:"#ffffff88",fontWeight:500}}>Revenue</T><T k="value" s={{fontSize:26,fontWeight:600,color:"#fff"}}>$48.2k</T><T k="delta" s={{fontSize:11,color:"#ffffff99"}}>+12.5%</T></div>;
  }

  /* ---- IMAGE-PLACEHOLDER ---- */
  if(type==="image-placeholder"){
    const ico=<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={v===1?p.ac:p.mu} strokeWidth="1.5" strokeLinecap="round" opacity={v===1?.45:.2}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>;
    if(v===0)return <div style={{...b,background:p.su,borderRadius:12,border:`1px solid ${p.bd}`,display:"flex",alignItems:"center",justifyContent:"center"}}>{ico}</div>;
    if(v===1)return <div style={{...b,background:`linear-gradient(135deg,${p.ac}18,${p.ac2}18)`,borderRadius:16,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{width:48,height:48,borderRadius:999,background:p.ac+"14",display:"flex",alignItems:"center",justifyContent:"center"}}>{ico}</div></div>;
    return <div style={{...b,background:p.su,borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",border:`1.5px dashed ${p.mu}28`}}><T k="label" s={{fontSize:11,color:p.mu,opacity:.3}}>Drop image</T></div>;
  }

  /* ---- AVATAR-ROW ---- */
  if(type==="avatar-row"){
    const rd=v===2?8:999, sz=v===1?26:v===2?34:30, ol=v===1?-5:-8;
    return <div style={{...b,display:"flex",alignItems:"center"}}>{[0,1,2,3].map(i=><div key={i} style={{width:sz,height:sz,borderRadius:rd,background:[p.ac+"40",p.ac2+"40",p.mu+"28",p.ac+"22"][i],border:`2px solid ${p.bg}`,marginLeft:i>0?ol:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:v===2?11:10,fontWeight:500,color:p.mu}}>{["A","B","C","+"][i]}</div>)}</div>;
  }

  /* ---- LIST-ITEM ---- */
  if(type==="list-item"){
    if(v===0)return <div style={{...b,background:p.card,borderRadius:12,border:`1px solid ${p.bd}`,padding:"0 14px",display:"flex",alignItems:"center",gap:12}}><div style={{width:36,height:36,borderRadius:10,background:p.su,flexShrink:0}}/><div style={{flex:1,display:"flex",flexDirection:"column",gap:4}}><div style={{height:9,width:"45%",background:p.su,borderRadius:4}}/><div style={{height:7,width:"65%",background:p.su,borderRadius:3}}/></div><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={p.mu} strokeWidth="2" opacity=".2"><path d="M9 18l6-6-6-6"/></svg></div>;
    if(v===1)return <div style={{...b,borderBottom:`1px solid ${p.bd}`,padding:"0 4px",display:"flex",alignItems:"center",gap:12}}><div style={{width:32,height:32,borderRadius:999,background:p.ac+"15",flexShrink:0}}/><div style={{flex:1,display:"flex",flexDirection:"column",gap:3}}><div style={{height:9,width:"40%",background:p.tx,opacity:.5,borderRadius:2}}/><div style={{height:7,width:"60%",background:p.mu,opacity:.12,borderRadius:2}}/></div></div>;
    return <div style={{...b,background:p.su,borderRadius:14,padding:"0 14px",display:"flex",alignItems:"center",gap:12}}><div style={{width:38,height:38,borderRadius:10,background:p.ac+"12",flexShrink:0}}/><div style={{flex:1,display:"flex",flexDirection:"column",gap:4}}><div style={{height:9,width:"45%",background:p.ac,opacity:.15,borderRadius:5}}/><div style={{height:7,width:"60%",background:p.mu,opacity:.08,borderRadius:4}}/></div></div>;
  }

  /* ---- INPUT ---- */
  if(type==="input"){
    if(v===0)return <div style={{...b,background:p.card,borderRadius:10,border:`1.5px solid ${p.bd}`,padding:"0 14px",display:"flex",alignItems:"center"}}><T k="ph" s={{fontSize:13,color:p.mu,opacity:.45}}>Enter your email...</T></div>;
    if(v===1)return <div style={{...b,display:"flex",flexDirection:"column",gap:5,justifyContent:"flex-end"}}><T k="label" s={{fontSize:10,fontWeight:500,color:p.mu}}>Email</T><div style={{height:34,borderRadius:5,border:`1.5px solid ${p.bd}`,padding:"0 10px",display:"flex",alignItems:"center"}}><T k="ph" s={{fontSize:13,color:p.mu,opacity:.4}}>you@example.com</T></div></div>;
    return <div style={{...b,background:p.su,borderRadius:10,padding:"0 14px",display:"flex",alignItems:"center"}}><T k="ph" s={{fontSize:13,color:p.mu,opacity:.4}}>Enter your email...</T></div>;
  }

  /* ---- SEARCH ---- */
  if(type==="search"){
    const ico=<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={p.mu} strokeWidth="2" strokeLinecap="round" opacity=".3"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>;
    if(v===0)return <div style={{...b,background:p.card,borderRadius:10,border:`1.5px solid ${p.bd}`,padding:"0 12px",display:"flex",alignItems:"center",gap:8}}>{ico}<T k="ph" s={{fontSize:13,color:p.mu,opacity:.4}}>Search...</T></div>;
    if(v===1)return <div style={{...b,background:p.su,borderRadius:999,padding:"0 14px",display:"flex",alignItems:"center",gap:8}}>{ico}<T k="ph" s={{fontSize:13,color:p.mu,opacity:.4}}>Search...</T><span style={{marginLeft:"auto",fontSize:9,color:p.mu,opacity:.25,border:`1px solid ${p.bd}`,borderRadius:4,padding:"2px 6px"}}>Cmd+K</span></div>;
    return <div style={{...b,background:p.card,borderRadius:0,borderBottom:`2px solid ${p.ac}30`,padding:"0 8px",display:"flex",alignItems:"center",gap:8}}>{ico}<T k="ph" s={{fontSize:13,color:p.mu,opacity:.4}}>Search...</T></div>;
  }

  /* ---- TOGGLE ---- */
  if(type==="toggle"){
    if(v===0)return <div style={{...b,background:p.ac,borderRadius:999,padding:3,display:"flex",alignItems:"center",justifyContent:"flex-end"}}><div style={{width:20,height:20,borderRadius:999,background:"#fff",boxShadow:"0 1px 3px rgba(0,0,0,.1)"}}/></div>;
    return <div style={{...b,background:p.ac+"2A",borderRadius:6,padding:3,display:"flex",alignItems:"center",justifyContent:"flex-end"}}><div style={{width:20,height:20,borderRadius:4,background:p.ac}}/></div>;
  }

  /* ---- BADGE ---- */
  if(type==="badge"){
    if(v===0)return <div style={{...b,background:p.ac+"14",borderRadius:999,display:"flex",alignItems:"center",justifyContent:"center"}}><T k="label" s={{fontSize:11,fontWeight:600,color:p.ac}}>New</T></div>;
    if(v===1)return <div style={{...b,background:p.ac,borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center"}}><T k="label" s={{fontSize:11,fontWeight:600,color:"#fff"}}>New</T></div>;
    return <div style={{...b,border:`1.5px solid ${p.ac}44`,borderRadius:999,display:"flex",alignItems:"center",justifyContent:"center"}}><T k="label" s={{fontSize:11,fontWeight:500,color:p.ac}}>New</T></div>;
  }

  /* ---- TOAST ---- */
  if(type==="toast"){
    if(v===0)return <div style={{...b,background:p.card,borderRadius:12,border:`1px solid ${p.bd}`,padding:"0 14px",display:"flex",alignItems:"center",gap:10,boxShadow:`0 4px 20px ${p.tx}08`}}><div style={{width:20,height:20,borderRadius:999,background:"#4CAF5018"}}/><T k="label" s={{fontSize:12,color:p.tx,fontWeight:500}}>Changes saved</T></div>;
    if(v===1)return <div style={{...b,background:p.tx,borderRadius:8,padding:"0 14px",display:"flex",alignItems:"center",gap:10}}><T k="label" s={{fontSize:12,color:p.bg,fontWeight:500}}>Changes saved</T><T k="action" s={{marginLeft:"auto",fontSize:11,color:p.bg,opacity:.45}}>Undo</T></div>;
    return <div style={{...b,background:p.card,borderRadius:4,borderLeft:`3px solid #4CAF50`,padding:"0 14px",display:"flex",alignItems:"center",boxShadow:`0 2px 10px ${p.tx}06`}}><T k="label" s={{fontSize:12,color:p.tx,fontWeight:500}}>Changes saved</T></div>;
  }

  /* ---- PROGRESS ---- */
  if(type==="progress"){
    const rd=[999,4,0];
    return <div style={{...b,background:p.su,borderRadius:rd[v],overflow:"hidden"}}><div style={{width:"68%",height:"100%",background:v===1?`linear-gradient(90deg,${p.ac},${p.ac2})`:p.ac,borderRadius:rd[v]}}/></div>;
  }

  return <div style={{...b,background:p.su,borderRadius:12}}/>;
}

/* ========== MAIN APP ========== */
export default function App(){
  const [shapes,setShapes]=useState(()=>load("shapes",[]));
  const [sel,setSel]=useState(null);
  const [drag,setDrag]=useState(null);
  const [off,setOff]=useState({x:0,y:0});
  const [guides,setGuides]=useState([]);
  const [pal,setPal]=useState(()=>load("pal","warm"));
  const [taste,setTaste]=useState(()=>load("taste",{density:.2,roundness:.3,warmth:.5,complexity:.2,boldness:.3}));
  const [gest,setGest]=useState(()=>load("gest",0));
  const [hist,setHist]=useState([]);
  const [rsz,setRsz]=useState(null);
  const [expCat,setExpCat]=useState("Structure");
  const [prefV,setPrefV]=useState(()=>load("prefV",{}));
  const [hov,setHov]=useState(null);
  const [cam,setCam]=useState({x:0,y:0,z:1});
  const [pan,setPan]=useState(null);
  const cRef=useRef(null);
  const dRef=useRef(null);
  const camRef=useRef(cam);
  camRef.current=cam;

  /* ---- PERSIST ---- */
  useEffect(()=>{
    localStorage.setItem(STORE_KEY,JSON.stringify({shapes,pal,taste,prefV,gest}));
  },[shapes,pal,taste,prefV,gest]);

  /* ---- EXPORT / IMPORT ---- */
  const exportJSON=useCallback(()=>{
    const data=JSON.stringify({shapes,pal,taste,prefV,gest},null,2);
    const blob=new Blob([data],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;a.download="tasteprint-layout.json";a.click();
    URL.revokeObjectURL(url);
  },[shapes,pal,taste,prefV,gest]);

  const importJSON=useCallback(()=>{
    const input=document.createElement("input");
    input.type="file";input.accept=".json";
    input.onchange=e=>{
      const file=e.target.files[0];if(!file)return;
      const reader=new FileReader();
      reader.onload=ev=>{
        try{
          const d=JSON.parse(ev.target.result);
          if(d.shapes)setShapes(d.shapes);
          if(d.pal)setPal(d.pal);
          if(d.taste)setTaste(d.taste);
          if(d.prefV)setPrefV(d.prefV);
          if(d.gest!==undefined)setGest(d.gest);
        }catch{}
      };
      reader.readAsText(file);
    };
    input.click();
  },[]);

  /* ---- CANVAS COORD HELPERS ---- */
  const toCanvas=useCallback((cx,cy)=>{
    const r=cRef.current.getBoundingClientRect();
    const c=camRef.current;
    return{x:(cx-r.left-c.x)/c.z,y:(cy-r.top-c.y)/c.z};
  },[]);

  const push=useCallback(ns=>{setHist(h=>[...h.slice(-40),shapes]);setShapes(ns)},[shapes]);
  const undo=useCallback(()=>{if(!hist.length)return;setShapes(hist[hist.length-1]);setHist(h=>h.slice(0,-1))},[hist]);
  const nudge=useCallback(d=>{setGest(g=>g+1);setTaste(prev=>{const t={...prev};for(const[k,val]of Object.entries(d))t[k]=Math.max(0,Math.min(1,(t[k]||0)+val));return t})},[]);

  const cycle=useCallback((id,dir)=>{
    const s=shapes.find(x=>x.id===id);if(!s)return;
    const mx=maxV(s.type);let nv=((s.variant||0)+dir)%mx;if(nv<0)nv=mx-1;
    setShapes(shapes.map(x=>x.id===id?{...x,variant:nv}:x));
    setPrefV(pv=>({...pv,[s.type]:nv}));
    const vn=varName(s.type,nv).toLowerCase();
    if(vn.includes("pill")||vn.includes("round"))nudge({roundness:.03});
    else if(vn.includes("brutal")||vn.includes("bold")||vn.includes("invert"))nudge({boldness:.03});
    else if(vn.includes("fill")||vn.includes("tint"))nudge({warmth:.02});
    else if(vn.includes("minimal")||vn.includes("ghost")||vn.includes("underline"))nudge({density:-.02,boldness:-.01});
    else nudge({complexity:.01});
  },[shapes,nudge]);

  const cycleFont=useCallback((id,dir)=>{
    setShapes(prev=>prev.map(s=>{
      if(s.id!==id)return s;
      let nf=((s.font||0)+dir)%FONTS.length;
      if(nf<0)nf=FONTS.length-1;
      return{...s,font:nf};
    }));
  },[]);

  const delShape=useCallback((id)=>{
    push(shapes.filter(s=>s.id!==id));
    if(sel===id)setSel(null);
  },[shapes,push,sel]);

  const updateText=useCallback((id,key,value)=>{
    setShapes(prev=>prev.map(s=>{
      if(s.id!==id)return s;
      const texts={...(s.texts||{})};
      if(value===null||value===undefined)delete texts[key];
      else texts[key]=value;
      return{...s,texts};
    }));
  },[]);

  const onDrop=useCallback(e=>{
    e.preventDefault();const info=dRef.current;if(!info)return;
    const pt=toCanvas(e.clientX,e.clientY);
    const ns={id:uid(),type:info.type,x:pt.x-info.w/2,y:pt.y-info.h/2,w:info.w,h:info.h,variant:prefV[info.type]||0,texts:{},font:0};
    const sn=snap(ns,shapes);if(sn.x!==null)ns.x=sn.x;if(sn.y!==null)ns.y=sn.y;
    push([...shapes,ns]);setSel(ns.id);nudge({complexity:.02});dRef.current=null;
  },[shapes,push,nudge,prefV,toCanvas]);

  const onDown=useCallback((e,s)=>{
    e.stopPropagation();setSel(s.id);setDrag(s.id);
    const pt=toCanvas(e.clientX,e.clientY);
    setOff({x:pt.x-s.x,y:pt.y-s.y});
  },[toCanvas]);

  const onMove=useCallback(e=>{
    /* pan */
    if(pan){
      setCam(c=>({...c,x:c.x+(e.clientX-pan.x),y:c.y+(e.clientY-pan.y)}));
      setPan({x:e.clientX,y:e.clientY});
      return;
    }
    if(!drag&&!rsz)return;
    const pt=toCanvas(e.clientX,e.clientY);
    if(rsz){const s=shapes.find(x=>x.id===rsz);if(!s)return;setShapes(shapes.map(x=>x.id===rsz?{...x,w:Math.max(40,pt.x-x.x),h:Math.max(20,pt.y-x.y)}:x));return}
    if(drag){let nx=pt.x-off.x,ny=pt.y-off.y;const s=shapes.find(x=>x.id===drag);if(!s)return;const sn=snap({...s,x:nx,y:ny},shapes);if(sn.x!==null)nx=sn.x;if(sn.y!==null)ny=sn.y;setGuides(sn.g);setShapes(shapes.map(x=>x.id===drag?{...x,x:nx,y:ny}:x))}
  },[drag,rsz,shapes,off,pan,toCanvas]);

  const onUp=useCallback(()=>{
    if(pan)setPan(null);
    if(drag){nudge({density:.01});setDrag(null);setGuides([])}
    if(rsz)setRsz(null);
  },[drag,rsz,nudge,pan]);

  const onDel=useCallback(()=>{if(!sel)return;push(shapes.filter(s=>s.id!==sel));setSel(null)},[sel,shapes,push]);

  /* ---- KEYBOARD ---- */
  useEffect(()=>{const h=e=>{if((e.key==="Backspace"||e.key==="Delete")&&!e.target.isContentEditable){e.preventDefault();onDel()}if((e.metaKey||e.ctrlKey)&&e.key==="z"){e.preventDefault();undo()}};window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h)},[onDel,undo]);

  /* ---- WHEEL: pan & zoom ---- */
  useEffect(()=>{
    const el=cRef.current;if(!el)return;
    const h=e=>{
      e.preventDefault();
      if(e.ctrlKey||e.metaKey){
        const r=el.getBoundingClientRect();
        const mx=e.clientX-r.left,my=e.clientY-r.top;
        const dz=e.deltaY>0?0.92:1.08;
        setCam(c=>{const nz=Math.max(.15,Math.min(4,c.z*dz));return{x:mx-(mx-c.x)*(nz/c.z),y:my-(my-c.y)*(nz/c.z),z:nz}});
      }else{
        setCam(c=>({...c,x:c.x-e.deltaX,y:c.y-e.deltaY}));
      }
    };
    el.addEventListener("wheel",h,{passive:false});
    return()=>el.removeEventListener("wheel",h);
  },[]);

  useEffect(()=>{if(["warm","candy"].includes(pal))nudge({warmth:.04});else if(pal==="cool")nudge({warmth:-.04});else if(pal==="noir")nudge({boldness:.05,warmth:-.06})},[pal]);

  const p=PAL[pal];
  const btnSt={background:"none",border:`1px solid ${p.bd}`,borderRadius:8,padding:"5px 12px",fontSize:11,color:p.mu,cursor:"pointer",fontFamily:"inherit"};
  const zoomPct=Math.round(cam.z*100);

  return(
    <div style={{width:"100%",height:"100vh",display:"flex",flexDirection:"column",background:p.bg,fontFamily:"'DM Sans',system-ui,sans-serif",color:p.tx,transition:"background .4s,color .4s"}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&family=Outfit:wght@400;500;600;700&family=Sora:wght@400;500;600;700&family=Work+Sans:wght@400;500;600;700&family=Figtree:wght@400;500;600;700&family=Instrument+Serif&display=swap" rel="stylesheet"/>

      {/* HEADER */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 20px",borderBottom:`1px solid ${p.bd}`,background:p.card+"cc",backdropFilter:"blur(12px)",zIndex:50,transition:"all .4s"}}>
        <div style={{display:"flex",alignItems:"baseline",gap:8}}><span style={{fontFamily:"'Instrument Serif',Georgia,serif",fontSize:22,color:p.tx,letterSpacing:"-0.02em"}}>Tasteprint</span><span style={{fontSize:10,color:p.mu,letterSpacing:"0.1em",textTransform:"uppercase"}}>playground</span></div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{display:"flex",gap:5}}>{Object.entries(PAL).map(([k,v])=><button key={k} onClick={()=>setPal(k)} title={v.name} style={{width:20,height:20,borderRadius:999,border:pal===k?`2px solid ${p.ac}`:"2px solid transparent",background:k==="noir"?"#1A1A1E":v.ac,cursor:"pointer",transition:"all .2s",transform:pal===k?"scale(1.2)":"scale(1)"}}/>)}</div>
          <div style={{width:1,height:20,background:p.bd}}/>
          <div style={{display:"flex",alignItems:"center",gap:4}}><span style={{fontSize:10,color:p.mu}}>{gest}</span><Radar taste={taste} ac={p.ac}/></div>
          <div style={{width:1,height:20,background:p.bd}}/>
          <button onClick={exportJSON} title="Export layout" style={btnSt}>Export</button>
          <button onClick={importJSON} title="Import layout" style={btnSt}>Import</button>
          <button onClick={undo} style={btnSt}>Undo</button>
        </div>
      </div>

      <div style={{display:"flex",flex:1,overflow:"hidden"}}>
        {/* LIBRARY */}
        <div style={{width:210,padding:"10px 0",overflowY:"auto",borderRight:`1px solid ${p.bd}`,background:p.card+"88",backdropFilter:"blur(8px)",flexShrink:0,transition:"all .4s"}}>
          <div style={{padding:"2px 14px 8px",fontSize:9,color:p.mu,textTransform:"uppercase",letterSpacing:"0.1em"}}>Components</div>
          {LIB.map(cat=>(
            <div key={cat.cat}>
              <div onClick={()=>setExpCat(expCat===cat.cat?null:cat.cat)} style={{padding:"6px 14px",fontSize:11,fontWeight:500,color:expCat===cat.cat?p.tx:p.mu,cursor:"pointer",userSelect:"none"}}><span style={{display:"inline-block",width:12,fontSize:9,transition:"transform .2s",transform:expCat===cat.cat?"rotate(90deg)":"rotate(0)"}}>{">"}</span>{cat.cat}</div>
              {expCat===cat.cat&&(
                <div style={{padding:"0 6px 6px",display:"flex",flexDirection:"column",gap:2}}>
                  {cat.items.map(item=>{
                    const pv=prefV[item.type]||0;const vn=varName(item.type,pv);
                    return(
                      <div key={item.type} draggable onDragStart={()=>{dRef.current=item}}
                        style={{padding:"7px 8px",borderRadius:8,cursor:"grab",display:"flex",alignItems:"center",gap:10,transition:"background .12s"}}
                        onMouseEnter={e=>e.currentTarget.style.background=p.su} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                        <div style={{width:44,height:30,borderRadius:5,overflow:"hidden",flexShrink:0,pointerEvents:"none",border:`1px solid ${p.bd}`,transition:"all .25s"}}>
                          <div style={{transform:`scale(${Math.min(44/item.w,30/item.h)})`,transformOrigin:"top left",width:item.w,height:item.h}}><C type={item.type} v={pv} p={p}/></div>
                        </div>
                        <div style={{display:"flex",flexDirection:"column",gap:1,minWidth:0}}>
                          <span style={{fontSize:11,color:p.tx}}>{item.label}</span>
                          <span style={{fontSize:9,color:p.mu,opacity:.6}}>{vn}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* CANVAS */}
        <div ref={cRef} onDrop={onDrop} onDragOver={e=>e.preventDefault()} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
          onMouseDown={e=>{
            if(e.button===1){e.preventDefault();setPan({x:e.clientX,y:e.clientY})}
            if(e.button===0&&(e.target===cRef.current||e.target.closest("[data-c]")))setSel(null);
          }}
          onContextMenu={e=>e.preventDefault()}
          style={{flex:1,position:"relative",overflow:"hidden",cursor:pan?"grabbing":"default"}}>

          {/* dot grid */}
          <svg data-c="1" style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none"}}>
            <defs><pattern id="dots" x={cam.x%20} y={cam.y%20} width={20*cam.z} height={20*cam.z} patternUnits="userSpaceOnUse"><circle cx={10*cam.z} cy={10*cam.z} r={Math.max(.3,.5*cam.z)} fill={p.mu} opacity=".1"/></pattern></defs>
            <rect data-c="1" width="100%" height="100%" fill="url(#dots)" style={{pointerEvents:"all"}}/>
          </svg>

          {/* snap guides */}
          {guides.map((g,i)=><div key={i} style={{position:"absolute",pointerEvents:"none",zIndex:300,background:p.ac+"40",...(g.t==="v"?{left:g.p*cam.z+cam.x,top:0,width:1,height:"100%"}:{top:g.p*cam.z+cam.y,left:0,height:1,width:"100%"})}}/>)}

          {/* transform layer */}
          <div style={{position:"absolute",left:0,top:0,transform:`translate(${cam.x}px,${cam.y}px) scale(${cam.z})`,transformOrigin:"0 0",willChange:"transform"}}>
            {shapes.map(s=>{
              const isSel=sel===s.id,isDrg=drag===s.id,isHov=hov===s.id;
              const mx=maxV(s.type);
              const vn=varName(s.type,s.variant||0);
              const fn=FONTS[s.font||0]?.name||FONTS[0].name;
              const ff=FONTS[s.font||0]?.family||FONTS[0].family;
              return(
                <div key={s.id} style={{position:"absolute",left:s.x,top:s.y,width:s.w,zIndex:isDrg?100:isSel?50:1}}>
                  {/* toolbar: variant + font pickers — only on select */}
                  {isSel&&!isDrg&&(
                    <div style={{position:"absolute",top:-36,left:"50%",transform:"translateX(-50%)",display:"flex",alignItems:"center",gap:1,zIndex:200,background:p.card,border:`1px solid ${p.bd}`,borderRadius:999,padding:"2px 3px",boxShadow:`0 4px 16px ${p.tx}10`,whiteSpace:"nowrap",userSelect:"none"}}>
                      {mx>1&&<>
                        <button onPointerDown={e=>{e.stopPropagation();e.preventDefault();cycle(s.id,-1)}} style={{width:26,height:26,borderRadius:999,border:"none",background:p.su,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:p.tx,fontSize:15,fontFamily:"system-ui",padding:0}}>{"‹"}</button>
                        <span style={{fontSize:9,color:p.mu,padding:"0 4px",width:68,textAlign:"center",overflow:"hidden",textOverflow:"ellipsis"}}>{vn}</span>
                        <button onPointerDown={e=>{e.stopPropagation();e.preventDefault();cycle(s.id,1)}} style={{width:26,height:26,borderRadius:999,border:"none",background:p.su,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:p.tx,fontSize:15,fontFamily:"system-ui",padding:0}}>{"›"}</button>
                        <div style={{width:1,height:16,background:p.bd,margin:"0 2px"}}/>
                      </>}
                      <button onPointerDown={e=>{e.stopPropagation();e.preventDefault();cycleFont(s.id,-1)}} style={{width:26,height:26,borderRadius:999,border:"none",background:p.su,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:p.tx,fontSize:15,fontFamily:"system-ui",padding:0}}>{"‹"}</button>
                      <span style={{fontSize:9,color:p.ac,padding:"0 4px",width:100,textAlign:"center",fontFamily:ff,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis"}}>{fn}</span>
                      <button onPointerDown={e=>{e.stopPropagation();e.preventDefault();cycleFont(s.id,1)}} style={{width:26,height:26,borderRadius:999,border:"none",background:p.su,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:p.tx,fontSize:15,fontFamily:"system-ui",padding:0}}>{"›"}</button>
                    </div>
                  )}
                  {/* delete button — only on select */}
                  {isSel&&!isDrg&&(
                    <button onPointerDown={e=>{e.stopPropagation();e.preventDefault();delShape(s.id)}}
                      style={{position:"absolute",top:-10,right:-10,width:22,height:22,borderRadius:999,background:p.mu+"88",border:"none",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",zIndex:201,transition:"background .15s"}}
                      onMouseEnter={e=>e.currentTarget.style.background="#E0524D"}
                      onMouseLeave={e=>e.currentTarget.style.background=p.mu+"88"}>
                      <svg width="10" height="10" viewBox="0 0 10 10" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"><line x1="2" y1="2" x2="8" y2="8"/><line x1="8" y1="2" x2="2" y2="8"/></svg>
                    </button>
                  )}
                  <div onMouseDown={e=>onDown(e,s)} onMouseEnter={()=>setHov(s.id)} onMouseLeave={()=>setHov(null)}
                    style={{width:s.w,height:s.h,cursor:isDrg?"grabbing":"grab",transition:isDrg?"none":"transform .1s",transform:isDrg?"scale(1.015)":"scale(1)",filter:isDrg?`drop-shadow(0 8px 20px ${p.ac}15)`:"none",outline:isSel?`2px solid ${p.ac}55`:"none",outlineOffset:4,borderRadius:14}}>
                    <C type={s.type} v={s.variant||0} p={p} editable={isSel} texts={s.texts||{}} onText={(k,val)=>updateText(s.id,k,val)} font={s.font||0}/>
                    {isSel&&<div onMouseDown={e=>{e.stopPropagation();setRsz(s.id)}} style={{position:"absolute",right:-4,bottom:-4,width:8,height:8,background:p.ac,borderRadius:2,cursor:"nwse-resize",zIndex:11}}/>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* empty state */}
          {shapes.length===0&&(
            <div data-c="1" style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}>
              <p style={{fontFamily:"'Instrument Serif',Georgia,serif",fontSize:26,color:p.mu,opacity:.3,margin:"0 0 6px"}}>Drag components here</p>
              <p style={{fontSize:13,color:p.mu,opacity:.2}}>Switch styles with arrows. Your taste is remembered.</p>
            </div>
          )}

          {/* zoom indicator */}
          <div style={{position:"absolute",bottom:12,right:14,display:"flex",alignItems:"center",gap:6,zIndex:60}}>
            <button onClick={()=>setCam(c=>{const nz=Math.max(.15,c.z-0.15);const el=cRef.current.getBoundingClientRect();const mx=el.width/2,my=el.height/2;return{x:mx-(mx-c.x)*(nz/c.z),y:my-(my-c.y)*(nz/c.z),z:nz}})} style={{width:24,height:24,borderRadius:6,border:`1px solid ${p.bd}`,background:p.card,color:p.mu,fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"system-ui",padding:0}}>-</button>
            <button onClick={()=>setCam({x:0,y:0,z:1})} title="Reset zoom" style={{fontSize:10,color:p.mu,background:p.card,border:`1px solid ${p.bd}`,borderRadius:6,padding:"3px 8px",cursor:"pointer",fontFamily:"inherit",minWidth:42,textAlign:"center"}}>{zoomPct}%</button>
            <button onClick={()=>setCam(c=>{const nz=Math.min(4,c.z+0.15);const el=cRef.current.getBoundingClientRect();const mx=el.width/2,my=el.height/2;return{x:mx-(mx-c.x)*(nz/c.z),y:my-(my-c.y)*(nz/c.z),z:nz}})} style={{width:24,height:24,borderRadius:6,border:`1px solid ${p.bd}`,background:p.card,color:p.mu,fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"system-ui",padding:0}}>+</button>
          </div>
        </div>
      </div>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(128,128,128,.12);border-radius:2px}`}</style>
    </div>
  );
}
