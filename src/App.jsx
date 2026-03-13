import React, { useState, useRef, useCallback, useEffect } from "react";
import { toPng } from "html-to-image";

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
  {name:"Geist",family:"'Geist',system-ui,sans-serif"},
  {name:"JetBrains Mono",family:"'JetBrains Mono',monospace"},
  {name:"Playfair Display",family:"'Playfair Display',Georgia,serif"},
  {name:"Bricolage Grotesque",family:"'Bricolage Grotesque',system-ui,sans-serif"},
  {name:"General Sans",family:"'General Sans',system-ui,sans-serif"},
  {name:"Cabinet Grotesk",family:"'Cabinet Grotesk',system-ui,sans-serif"},
  {name:"Poppins",family:"'Poppins',system-ui,sans-serif"},
];

const PAL = {
  warm:  { bg:"#FFF8F2",card:"#FFFFFF",ac:"#E07A5F",ac2:"#F2B880",tx:"#3D2C2C",mu:"#9C8578",bd:"rgba(224,122,95,0.12)",su:"#FDF0E8",name:"Warm" },
  cool:  { bg:"#F4F7FB",card:"#FFFFFF",ac:"#5B8DB8",ac2:"#7CAED4",tx:"#2C3644",mu:"#7A8B9C",bd:"rgba(91,141,184,0.12)",su:"#EBF2F8",name:"Cool" },
  earth: { bg:"#F7F4F0",card:"#FFFFFF",ac:"#8C7B6C",ac2:"#B8A08C",tx:"#3D3630",mu:"#A09488",bd:"rgba(140,123,108,0.12)",su:"#F0ECE6",name:"Earth" },
  noir:  { bg:"#1A1A1E",card:"#242428",ac:"#FFFFFF",ac2:"#888890",tx:"#F0F0F2",mu:"#78787E",bd:"rgba(255,255,255,0.08)",su:"#2A2A2E",name:"Noir" },
  candy: { bg:"#FFF5F9",card:"#FFFFFF",ac:"#E8589C",ac2:"#A864D4",tx:"#3A2434",mu:"#A88898",bd:"rgba(232,88,156,0.12)",su:"#FDE8F2",name:"Candy" },
  cloud: { bg:"#FAF8F5",card:"#FFFFFF",ac:"#B8A99A",ac2:"#D4C5B5",tx:"#3A3530",mu:"#A09890",bd:"rgba(184,169,154,0.12)",su:"#F4F0EB",name:"Cloud" },
  mono:  { bg:"#F5F5F5",card:"#FFFFFF",ac:"#555555",ac2:"#888888",tx:"#1A1A1A",mu:"#888888",bd:"rgba(0,0,0,0.08)",su:"#EEEEEE",name:"Mono" },
  neon:  { bg:"#0F1114",card:"#1A1D22",ac:"#39FF14",ac2:"#CCFF00",tx:"#E8E8E8",mu:"#6B7080",bd:"rgba(57,255,20,0.1)",su:"#161920",name:"Neon" },
  mint:  { bg:"#F2F8F6",card:"#FFFFFF",ac:"#3B9B7A",ac2:"#6BC4A6",tx:"#1E3A30",mu:"#7A9E90",bd:"rgba(59,155,122,0.12)",su:"#E8F4F0",name:"Mint" },
  mocha: { bg:"#F5F0EB",card:"#FFFFFF",ac:"#6F4E37",ac2:"#A0785C",tx:"#2C2018",mu:"#8C7A6B",bd:"rgba(111,78,55,0.12)",su:"#EDE6DF",name:"Mocha" },
  lavender:{ bg:"#F5F2FA",card:"#FFFFFF",ac:"#7C5CBF",ac2:"#A78BDA",tx:"#2A2040",mu:"#8A80A0",bd:"rgba(124,92,191,0.12)",su:"#ECE8F6",name:"Lavender" },
  ocean: { bg:"#F0F6FA",card:"#FFFFFF",ac:"#2B7A9E",ac2:"#5BAFCE",tx:"#1A3040",mu:"#6A8C9E",bd:"rgba(43,122,158,0.12)",su:"#E4F0F6",name:"Ocean" },
  forest:{ bg:"#F0F4F0",card:"#FFFFFF",ac:"#3D6B4E",ac2:"#6B9E7C",tx:"#1A2E20",mu:"#6A8B72",bd:"rgba(61,107,78,0.12)",su:"#E4EDE6",name:"Forest" },
};

const VARIANTS = {
  button:    ["Filled","Outline","Ghost","Pill","Brutal","Glass"],
  card:      ["Elevated","Outlined","Filled bg","Top media","Minimal","Glass","Brutal"],
  "card-sm": ["Rounded","Horizontal","Tinted"],
  hero:      ["Gradient","Centered","Bold fill"],
  navbar:    ["Classic","Underline","Pill","Glass"],
  tabs:      ["Segmented","Underline","Pill chips"],
  heading:   ["Clean","Accent bar","Overline"],
  "stat-card":["Outlined","Tinted icon","Left accent","Inverted"],
  "image-placeholder":["Subtle","Gradient","Dashed"],
  "avatar-row":["Circular","Small tight","Rounded sq"],
  "list-item":["Card row","Divider","Tinted"],
  input:     ["Outlined","Labeled","Filled"],
  search:    ["Bordered","Pill kbd","Underline"],
  toggle:    ["Round","Square"],
  badge:     ["Tinted","Solid","Outline","Glass","Brutal"],
  toast:     ["Card","Dark snack","Accent bar","Glass"],
  progress:  ["Round","Flat","Thin"],
  modal:     ["Default","Minimal","Sheet"],
  sidebar:   ["Default","Minimal","Grouped"],
  table:     ["Striped","Bordered","Minimal"],
  accordion: ["Bordered","Card","Minimal"],
  footer:    ["Columns","Simple","Dark"],
  "bento-grid":["Even","Featured","Mixed"],
  dropdown:  ["Default","Minimal","Rounded"],
  select:    ["Default","Pill","Underline"],
  checkbox:  ["Square","Round","Toggle row"],
  slider:    ["Default","Thin","Stepped"],
  alert:     ["Info","Warning","Success","Error"],
  pagination:["Default","Dots","Minimal"],
  "pricing-card":["Default","Featured","Minimal"],
  tooltip:   ["Default","Dark","Arrow"],
  breadcrumb:["Slash","Arrow","Dots"],
  skeleton:  ["Card","List","Profile"],
  chart:     ["Bar","Line","Donut"],
  testimonial:["Card","Minimal","Bubble"],
  "cmd-palette":["Default","Minimal","Grouped"],
  stepper:   ["Horizontal","Vertical","Dots"],
  timeline:  ["Left","Centered","Minimal"],
};

const LIB = [
  { cat:"Structure", items:[
    {type:"card",label:"Card",w:280,h:200},
    {type:"card-sm",label:"Small card",w:200,h:130},
    {type:"hero",label:"Hero",w:480,h:210},
    {type:"bento-grid",label:"Bento grid",w:340,h:220},
  ]},
  { cat:"Navigation", items:[
    {type:"navbar",label:"Nav bar",w:480,h:52},
    {type:"tabs",label:"Tabs",w:300,h:42},
    {type:"sidebar",label:"Sidebar",w:180,h:280},
    {type:"footer",label:"Footer",w:480,h:110},
  ]},
  { cat:"Content", items:[
    {type:"heading",label:"Heading",w:260,h:44},
    {type:"stat-card",label:"Stat card",w:160,h:110},
    {type:"image-placeholder",label:"Image",w:240,h:150},
    {type:"avatar-row",label:"Avatars",w:150,h:40},
    {type:"list-item",label:"List item",w:300,h:60},
    {type:"table",label:"Table",w:360,h:180},
    {type:"accordion",label:"Accordion",w:300,h:170},
  ]},
  { cat:"Input", items:[
    {type:"button",label:"Button",w:148,h:44},
    {type:"input",label:"Text input",w:248,h:44},
    {type:"search",label:"Search",w:270,h:44},
    {type:"toggle",label:"Toggle",w:48,h:28},
    {type:"dropdown",label:"Dropdown",w:200,h:150},
    {type:"select",label:"Select",w:220,h:40},
    {type:"checkbox",label:"Checkbox",w:180,h:90},
    {type:"slider",label:"Slider",w:200,h:28},
  ]},
  { cat:"Feedback", items:[
    {type:"badge",label:"Badge",w:72,h:28},
    {type:"toast",label:"Toast",w:290,h:56},
    {type:"progress",label:"Progress",w:220,h:8},
    {type:"alert",label:"Alert",w:300,h:56},
    {type:"pagination",label:"Pagination",w:220,h:36},
  ]},
  { cat:"Commerce", items:[
    {type:"pricing-card",label:"Pricing card",w:240,h:280},
  ]},
  { cat:"Data", items:[
    {type:"chart",label:"Chart",w:260,h:180},
    {type:"testimonial",label:"Testimonial",w:280,h:140},
    {type:"skeleton",label:"Skeleton",w:260,h:120},
  ]},
  { cat:"Utility", items:[
    {type:"tooltip",label:"Tooltip",w:140,h:60},
    {type:"breadcrumb",label:"Breadcrumb",w:240,h:28},
    {type:"cmd-palette",label:"Cmd palette",w:300,h:200},
    {type:"stepper",label:"Stepper",w:280,h:44},
    {type:"timeline",label:"Timeline",w:240,h:200},
  ]},
  { cat:"Overlay", items:[
    {type:"modal",label:"Modal",w:300,h:200},
  ]},
];

function uid(){return Math.random().toString(36).substr(2,9)}
function maxV(t){return(VARIANTS[t]||[]).length||1}
function varName(t,v){return(VARIANTS[t]||[])[v]||"Default"}

const HAS_TEXT=new Set(["button","card","card-sm","hero","navbar","tabs","heading","stat-card","input","search","badge","toast","modal","sidebar","footer","accordion","table","list-item","dropdown","select","checkbox","alert","pagination","pricing-card","tooltip","breadcrumb","testimonial","cmd-palette","stepper","timeline","bento-grid","chart"]);

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

/* ========== COMPONENT RENDERER ========== */
function C({type,v=0,p,editable,texts={},onText,font=0}){
  const f=FONTS[font]?.family||FONTS[0].family;
  const b={width:"100%",height:"100%",fontFamily:f,overflow:"hidden"};

  const T=({k,s,children})=>{
    const val=texts[k]!==undefined?texts[k]:children;
    const hasHtml=typeof val==="string"&&/<\w/.test(val);
    if(!editable)return hasHtml
      ?<span style={s} dangerouslySetInnerHTML={{__html:val}}/>
      :<span style={s}>{val}</span>;
    const ceProps={"data-text-key":k,contentEditable:true,suppressContentEditableWarning:true,
      onInput:e=>{onText?.(k,e.target.innerHTML)},
      onMouseDown:e=>e.stopPropagation(),
      onKeyDown:e=>{if(e.key==="Enter"){e.preventDefault();e.target.blur()}},
      style:{...s,outline:"none",cursor:"text",minWidth:8}};
    return hasHtml
      ?<span {...ceProps} dangerouslySetInnerHTML={{__html:val}}/>
      :<span {...ceProps}>{val}</span>;
  };

  const Img=({k,s,children})=>{
    const src=texts[k];
    const pick=()=>{if(!editable)return;const inp=document.createElement("input");inp.type="file";inp.accept="image/*";inp.onchange=ev=>{const file=ev.target.files[0];if(!file)return;const rd=new FileReader();rd.onload=r=>{onText?.(k,r.target.result)};rd.readAsDataURL(file)};inp.click()};
    const drop=e=>{e.preventDefault();e.stopPropagation();if(!editable)return;const file=(e.dataTransfer?.files||[])[0];if(!file||!file.type.startsWith("image/"))return;const rd=new FileReader();rd.onload=r=>{onText?.(k,r.target.result)};rd.readAsDataURL(file)};
    if(src)return <div style={{...s,overflow:"hidden",position:"relative"}} onClick={pick} onDragOver={e=>e.preventDefault()} onDrop={drop} onMouseDown={e=>e.stopPropagation()}><img src={src} style={{width:"100%",height:"100%",objectFit:"cover",display:"block"}}/></div>;
    return <div style={s} onClick={pick} onDragOver={e=>e.preventDefault()} onDrop={drop} onMouseDown={e=>e.stopPropagation()}>{children}</div>;
  };

  /* ---- BUTTON ---- */
  if(type==="button"){
    if(v===0)return <div style={{...b,background:p.ac,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center"}}><T k="label" s={{color:"#fff",fontSize:13,fontWeight:500}}>Get started</T></div>;
    if(v===1)return <div style={{...b,background:"transparent",borderRadius:10,border:`1.5px solid ${p.ac}55`,display:"flex",alignItems:"center",justifyContent:"center"}}><T k="label" s={{color:p.ac,fontSize:13,fontWeight:500}}>Learn more</T></div>;
    if(v===2)return <div style={{...b,background:"transparent",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center"}}><T k="label" s={{color:p.ac,fontSize:13,fontWeight:500}}>Learn more</T></div>;
    if(v===3)return <div style={{...b,background:p.ac,borderRadius:999,display:"flex",alignItems:"center",justifyContent:"center"}}><T k="label" s={{color:"#fff",fontSize:13,fontWeight:500}}>Get started</T></div>;
    if(v===4)return <div style={{...b,background:p.tx,borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",border:`2px solid ${p.tx}`}}><T k="label" s={{color:p.bg,fontSize:13,fontWeight:600,letterSpacing:"0.04em"}}>SUBMIT</T></div>;
    return <div style={{...b,background:`${p.ac}18`,backdropFilter:"blur(12px)",borderRadius:12,border:`1px solid ${p.ac}22`,display:"flex",alignItems:"center",justifyContent:"center"}}><T k="label" s={{color:p.ac,fontSize:13,fontWeight:500}}>Get started</T></div>;
  }

  /* ---- CARD ---- */
  if(type==="card"){
    if(v===0)return <div style={{...b,background:p.card,borderRadius:14,boxShadow:`0 2px 12px ${p.tx}08, 0 0 0 1px ${p.bd}`,padding:20,display:"flex",flexDirection:"column",gap:8}}><Img k="icon" s={{width:36,height:36,borderRadius:10,background:p.su}}/><T k="title" s={{fontSize:14,fontWeight:600,color:p.tx}}>Card title</T><T k="desc" s={{fontSize:11,color:p.mu,lineHeight:1.5}}>A short description for this card component</T><div style={{marginTop:"auto",height:34,borderRadius:8,background:p.ac,opacity:.12,display:"flex",alignItems:"center",justifyContent:"center"}}><T k="cta" s={{fontSize:11,color:p.ac,fontWeight:500}}>Action</T></div></div>;
    if(v===1)return <div style={{...b,background:p.card,borderRadius:12,border:`1px solid ${p.bd}`,padding:20,display:"flex",flexDirection:"column",gap:8}}><Img k="icon" s={{width:36,height:36,borderRadius:10,background:p.su}}/><T k="title" s={{fontSize:14,fontWeight:600,color:p.tx}}>Card title</T><T k="desc" s={{fontSize:11,color:p.mu,lineHeight:1.5}}>A short description for this card component</T><div style={{marginTop:"auto",height:34,borderRadius:8,border:`1.5px solid ${p.ac}33`,display:"flex",alignItems:"center",justifyContent:"center"}}><T k="cta" s={{fontSize:11,color:p.ac,fontWeight:500}}>Action</T></div></div>;
    if(v===2)return <div style={{...b,background:p.su,borderRadius:16,padding:22,display:"flex",flexDirection:"column",gap:8}}><Img k="icon" s={{width:40,height:40,borderRadius:999,background:p.ac+"18",display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{width:18,height:18,borderRadius:999,background:p.ac,opacity:.35}}/></Img><T k="title" s={{fontSize:14,fontWeight:600,color:p.tx}}>Card title</T><T k="desc" s={{fontSize:11,color:p.mu,lineHeight:1.5}}>A short description for this card</T><div style={{marginTop:"auto",height:36,borderRadius:10,background:p.ac,opacity:.1,display:"flex",alignItems:"center",justifyContent:"center"}}><T k="cta" s={{fontSize:11,color:p.ac,fontWeight:500}}>Action</T></div></div>;
    if(v===3)return <div style={{...b,background:p.card,borderRadius:14,border:`1px solid ${p.bd}`,overflow:"hidden",display:"flex",flexDirection:"column"}}><Img k="media" s={{height:"42%",background:p.su}}/><div style={{padding:16,display:"flex",flexDirection:"column",gap:6,flex:1}}><T k="title" s={{fontSize:14,fontWeight:600,color:p.tx}}>Card title</T><T k="desc" s={{fontSize:11,color:p.mu,lineHeight:1.5}}>Description text goes here</T></div></div>;
    if(v===4)return <div style={{...b,background:p.card,borderRadius:12,padding:20,display:"flex",flexDirection:"column",gap:8}}><T k="title" s={{fontSize:14,fontWeight:600,color:p.tx}}>Card title</T><T k="desc" s={{fontSize:11,color:p.mu,lineHeight:1.5}}>A minimal card layout with just text content for clean designs</T></div>;
    if(v===5)return <div style={{...b,background:`${p.card}88`,backdropFilter:"blur(16px)",borderRadius:16,border:`1px solid ${p.ac}15`,padding:20,display:"flex",flexDirection:"column",gap:8}}><Img k="icon" s={{width:36,height:36,borderRadius:10,background:`${p.ac}12`}}/><T k="title" s={{fontSize:14,fontWeight:600,color:p.tx}}>Card title</T><T k="desc" s={{fontSize:11,color:p.mu,lineHeight:1.5}}>A short description for this card</T><div style={{marginTop:"auto",height:34,borderRadius:10,background:`${p.ac}10`,display:"flex",alignItems:"center",justifyContent:"center"}}><T k="cta" s={{fontSize:11,color:p.ac,fontWeight:500}}>Action</T></div></div>;
    return <div style={{...b,background:p.card,borderRadius:4,border:`3px solid ${p.tx}`,boxShadow:`4px 4px 0 ${p.tx}`,padding:18,display:"flex",flexDirection:"column",gap:8}}><Img k="icon" s={{width:36,height:36,borderRadius:4,background:p.ac,opacity:.2}}/><T k="title" s={{fontSize:14,fontWeight:600,color:p.tx}}>Card title</T><T k="desc" s={{fontSize:11,color:p.mu,lineHeight:1.5}}>Description for this card</T><div style={{marginTop:"auto",height:34,borderRadius:4,background:p.tx,opacity:.08,display:"flex",alignItems:"center",justifyContent:"center"}}><T k="cta" s={{fontSize:11,color:p.tx,fontWeight:500,opacity:.5}}>Action</T></div></div>;
  }

  /* ---- CARD-SM ---- */
  if(type==="card-sm"){
    if(v===0)return <div style={{...b,background:p.card,borderRadius:14,border:`1px solid ${p.bd}`,padding:14,display:"flex",flexDirection:"column",gap:6}}><Img k="icon" s={{width:28,height:28,borderRadius:8,background:p.su}}/><T k="title" s={{fontSize:12,fontWeight:600,color:p.tx}}>Small card</T><T k="desc" s={{fontSize:10,color:p.mu}}>Short description</T></div>;
    if(v===1)return <div style={{...b,background:p.card,borderRadius:12,border:`1px solid ${p.bd}`,padding:14,display:"flex",gap:12,alignItems:"center"}}><Img k="icon" s={{width:44,height:44,borderRadius:10,background:p.su,flexShrink:0}}/><div style={{flex:1,display:"flex",flexDirection:"column",gap:4}}><T k="title" s={{fontSize:12,fontWeight:600,color:p.tx}}>Small card</T><T k="desc" s={{fontSize:10,color:p.mu}}>Short description</T></div></div>;
    return <div style={{...b,background:p.su,borderRadius:16,padding:14,display:"flex",flexDirection:"column",gap:6}}><Img k="icon" s={{width:30,height:30,borderRadius:999,background:p.ac+"1A"}}/><T k="title" s={{fontSize:12,fontWeight:600,color:p.tx}}>Small card</T><T k="desc" s={{fontSize:10,color:p.mu}}>Short description</T></div>;
  }

  /* ---- HERO ---- */
  if(type==="hero"){
    if(v===0)return <div style={{...b,background:`linear-gradient(135deg,${p.ac}12,${p.ac2}12)`,borderRadius:16,border:`1px solid ${p.bd}`,padding:32,display:"flex",flexDirection:"column",justifyContent:"center",gap:8}}><T k="title" s={{fontSize:20,fontWeight:700,color:p.tx,letterSpacing:"-0.02em"}}>Hero headline here</T><T k="sub" s={{fontSize:12,color:p.mu,lineHeight:1.5}}>Supporting text for the hero section</T><div style={{display:"flex",gap:10,marginTop:8}}><div style={{height:38,width:110,borderRadius:9,background:p.ac,display:"flex",alignItems:"center",justifyContent:"center"}}><T k="cta" s={{color:"#fff",fontSize:12,fontWeight:500}}>Get started</T></div><div style={{height:38,width:95,borderRadius:9,border:`1.5px solid ${p.ac}44`,display:"flex",alignItems:"center",justifyContent:"center"}}><T k="cta2" s={{color:p.ac,fontSize:12,fontWeight:500}}>Learn more</T></div></div></div>;
    if(v===1)return <div style={{...b,background:p.card,borderRadius:4,border:`1px solid ${p.bd}`,padding:"36px 32px",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8,textAlign:"center"}}><T k="title" s={{fontSize:20,fontWeight:700,color:p.tx}}>Hero headline</T><T k="sub" s={{fontSize:12,color:p.mu}}>Supporting text for this section</T><div style={{height:36,width:120,borderRadius:3,background:p.tx,marginTop:12,display:"flex",alignItems:"center",justifyContent:"center"}}><T k="cta" s={{color:p.bg,fontSize:12,fontWeight:500}}>Start now</T></div></div>;
    return <div style={{...b,background:p.ac,borderRadius:20,padding:36,display:"flex",flexDirection:"column",justifyContent:"center",gap:8}}><T k="title" s={{fontSize:20,fontWeight:700,color:"#fff"}}>Hero headline here</T><T k="sub" s={{fontSize:12,color:"#fff",opacity:.65,lineHeight:1.5}}>Supporting text for the hero section</T><div style={{height:38,width:115,borderRadius:999,background:"#fff",marginTop:10,display:"flex",alignItems:"center",justifyContent:"center"}}><T k="cta" s={{color:p.ac,fontSize:12,fontWeight:600}}>Get started</T></div></div>;
  }

  /* ---- NAVBAR ---- */
  if(type==="navbar"){
    const dl=["Home","Features","Pricing"];
    if(v===0)return <div style={{...b,background:p.card,borderRadius:12,border:`1px solid ${p.bd}`,padding:"0 18px",display:"flex",alignItems:"center",justifyContent:"space-between"}}><div style={{display:"flex",alignItems:"center",gap:16}}><Img k="logo" s={{width:20,height:20,borderRadius:6,background:p.ac,opacity:.6}}/>{dl.map((t,i)=><T key={i} k={`link${i}`} s={{fontSize:12,color:i===0?p.tx:p.mu,fontWeight:i===0?500:400}}>{t}</T>)}</div><div style={{height:30,width:74,borderRadius:8,background:p.ac,display:"flex",alignItems:"center",justifyContent:"center"}}><T k="cta" s={{color:"#fff",fontSize:11,fontWeight:500}}>Sign up</T></div></div>;
    if(v===1)return <div style={{...b,borderBottom:`1.5px solid ${p.bd}`,padding:"0 18px",display:"flex",alignItems:"center",justifyContent:"space-between"}}><div style={{display:"flex",alignItems:"center",gap:20}}><T k="brand" s={{fontSize:14,fontWeight:600,color:p.tx,letterSpacing:"-0.02em"}}>Brand</T>{dl.map((t,i)=><T key={i} k={`link${i}`} s={{fontSize:12,color:p.mu}}>{t}</T>)}</div><div style={{height:30,width:70,borderRadius:4,border:`1.5px solid ${p.tx}`,display:"flex",alignItems:"center",justifyContent:"center"}}><T k="cta" s={{color:p.tx,fontSize:11,fontWeight:500}}>Log in</T></div></div>;
    if(v===2)return <div style={{...b,background:p.su,borderRadius:999,padding:"0 5px 0 18px",display:"flex",alignItems:"center",justifyContent:"space-between"}}><div style={{display:"flex",alignItems:"center",gap:14}}><Img k="logo" s={{width:18,height:18,borderRadius:999,background:p.ac,opacity:.5}}/>{dl.map((t,i)=><T key={i} k={`link${i}`} s={{fontSize:12,color:i===0?p.tx:p.mu,fontWeight:i===0?500:400}}>{t}</T>)}</div><div style={{height:34,width:78,borderRadius:999,background:p.ac,display:"flex",alignItems:"center",justifyContent:"center"}}><T k="cta" s={{color:"#fff",fontSize:11,fontWeight:500}}>Contact</T></div></div>;
    return <div style={{...b,background:`${p.card}66`,backdropFilter:"blur(16px)",borderRadius:14,border:`1px solid ${p.ac}12`,padding:"0 18px",display:"flex",alignItems:"center",justifyContent:"space-between"}}><div style={{display:"flex",alignItems:"center",gap:16}}><Img k="logo" s={{width:20,height:20,borderRadius:6,background:p.ac,opacity:.4}}/>{dl.map((t,i)=><T key={i} k={`link${i}`} s={{fontSize:12,color:i===0?p.tx:p.mu+"cc",fontWeight:i===0?500:400}}>{t}</T>)}</div><div style={{height:30,width:74,borderRadius:8,background:`${p.ac}18`,display:"flex",alignItems:"center",justifyContent:"center"}}><T k="cta" s={{color:p.ac,fontSize:11,fontWeight:500}}>Sign up</T></div></div>;
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
    if(v===1)return <div style={{...b,background:p.su,borderRadius:14,padding:14,display:"flex",flexDirection:"column",justifyContent:"space-between"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><T k="label" s={{fontSize:10,color:p.mu,fontWeight:500}}>Revenue</T><Img k="icon" s={{width:28,height:28,borderRadius:999,background:p.ac+"14",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:12,color:p.ac}}>$</span></Img></div><T k="value" s={{fontSize:24,fontWeight:600,color:p.tx}}>$48.2k</T><div style={{height:4,borderRadius:2,background:p.ac+"1A"}}><div style={{width:"68%",height:"100%",borderRadius:2,background:p.ac,opacity:.5}}/></div></div>;
    if(v===2)return <div style={{...b,background:p.card,borderRadius:4,borderLeft:`3px solid ${p.ac}`,padding:14,display:"flex",flexDirection:"column",justifyContent:"space-between"}}><T k="label" s={{fontSize:10,color:p.mu,fontWeight:500}}>REVENUE</T><T k="value" s={{fontSize:28,fontWeight:600,color:p.tx}}>$48.2k</T><T k="delta" s={{fontSize:11,color:"#4CAF50",fontWeight:500}}>+12.5% vs prev</T></div>;
    return <div style={{...b,background:p.ac,borderRadius:14,padding:14,display:"flex",flexDirection:"column",justifyContent:"space-between"}}><T k="label" s={{fontSize:10,color:"#ffffff88",fontWeight:500}}>Revenue</T><T k="value" s={{fontSize:26,fontWeight:600,color:"#fff"}}>$48.2k</T><T k="delta" s={{fontSize:11,color:"#ffffff99"}}>+12.5%</T></div>;
  }

  /* ---- IMAGE-PLACEHOLDER ---- */
  if(type==="image-placeholder"){
    const src=texts.src;
    const upload=()=>{if(!editable)return;const inp=document.createElement("input");inp.type="file";inp.accept="image/*";inp.onchange=ev=>{const file=ev.target.files[0];if(!file)return;const rd=new FileReader();rd.onload=r=>{onText?.("src",r.target.result)};rd.readAsDataURL(file)};inp.click()};
    const ico=<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={v===1?p.ac:p.mu} strokeWidth="1.5" strokeLinecap="round" opacity={v===1?.45:.2}><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>;
    if(src)return <div style={{...b,borderRadius:12,overflow:"hidden",cursor:editable?"pointer":"default",position:"relative"}} onClick={upload}><img src={src} style={{width:"100%",height:"100%",objectFit:"cover"}}/>{editable&&<div style={{position:"absolute",inset:0,background:"rgba(0,0,0,.3)",display:"flex",alignItems:"center",justifyContent:"center",opacity:0,transition:"opacity .15s"}} onMouseEnter={e=>e.currentTarget.style.opacity=1} onMouseLeave={e=>e.currentTarget.style.opacity=0}><span style={{color:"#fff",fontSize:11,fontWeight:500}}>Replace image</span></div>}</div>;
    const placeholder=(st)=><div style={{...b,...st,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:6,cursor:editable?"pointer":"default"}} onClick={upload}>{ico}{editable&&<span style={{fontSize:10,color:p.mu,opacity:.4}}>Click to upload</span>}</div>;
    if(v===0)return placeholder({background:p.su,borderRadius:12,border:`1px solid ${p.bd}`});
    if(v===1)return placeholder({background:`linear-gradient(135deg,${p.ac}18,${p.ac2}18)`,borderRadius:16});
    return placeholder({background:p.su,borderRadius:4,border:`1.5px dashed ${p.mu}28`});
  }

  /* ---- AVATAR-ROW ---- */
  if(type==="avatar-row"){
    const rd=v===2?8:999, sz=v===1?26:v===2?34:30, ol=v===1?-5:-8;
    const labels=["A","B","C","+"];
    const bgs=[p.ac+"40",p.ac2+"40",p.mu+"28",p.ac+"22"];
    return <div style={{...b,display:"flex",alignItems:"center"}}>{[0,1,2,3].map(i=><Img key={i} k={`av${i}`} s={{width:sz,height:sz,borderRadius:rd,background:bgs[i],border:`2px solid ${p.bg}`,marginLeft:i>0?ol:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:v===2?11:10,fontWeight:500,color:p.mu}}>{labels[i]}</Img>)}</div>;
  }

  /* ---- LIST-ITEM ---- */
  if(type==="list-item"){
    if(v===0)return <div style={{...b,background:p.card,borderRadius:12,border:`1px solid ${p.bd}`,padding:"0 14px",display:"flex",alignItems:"center",gap:12}}><Img k="icon" s={{width:36,height:36,borderRadius:10,background:p.su,flexShrink:0}}/><div style={{flex:1,display:"flex",flexDirection:"column",gap:2}}><T k="title" s={{fontSize:12,fontWeight:600,color:p.tx}}>List item title</T><T k="desc" s={{fontSize:10,color:p.mu}}>Description text</T></div><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={p.mu} strokeWidth="2" opacity=".2"><path d="M9 18l6-6-6-6"/></svg></div>;
    if(v===1)return <div style={{...b,borderBottom:`1px solid ${p.bd}`,padding:"0 4px",display:"flex",alignItems:"center",gap:12}}><Img k="icon" s={{width:32,height:32,borderRadius:999,background:p.ac+"15",flexShrink:0}}/><div style={{flex:1,display:"flex",flexDirection:"column",gap:2}}><T k="title" s={{fontSize:12,fontWeight:500,color:p.tx}}>List item title</T><T k="desc" s={{fontSize:10,color:p.mu}}>Description text</T></div></div>;
    return <div style={{...b,background:p.su,borderRadius:14,padding:"0 14px",display:"flex",alignItems:"center",gap:12}}><Img k="icon" s={{width:38,height:38,borderRadius:10,background:p.ac+"12",flexShrink:0}}/><div style={{flex:1,display:"flex",flexDirection:"column",gap:2}}><T k="title" s={{fontSize:12,fontWeight:600,color:p.tx}}>List item title</T><T k="desc" s={{fontSize:10,color:p.mu}}>Description text</T></div></div>;
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
    if(v===2)return <div style={{...b,border:`1.5px solid ${p.ac}44`,borderRadius:999,display:"flex",alignItems:"center",justifyContent:"center"}}><T k="label" s={{fontSize:11,fontWeight:500,color:p.ac}}>New</T></div>;
    if(v===3)return <div style={{...b,background:`${p.ac}12`,backdropFilter:"blur(8px)",borderRadius:999,border:`1px solid ${p.ac}18`,display:"flex",alignItems:"center",justifyContent:"center"}}><T k="label" s={{fontSize:11,fontWeight:500,color:p.ac}}>New</T></div>;
    return <div style={{...b,background:p.ac,borderRadius:4,border:`2px solid ${p.tx}`,boxShadow:`2px 2px 0 ${p.tx}`,display:"flex",alignItems:"center",justifyContent:"center"}}><T k="label" s={{fontSize:11,fontWeight:700,color:"#fff"}}>New</T></div>;
  }

  /* ---- TOAST ---- */
  if(type==="toast"){
    if(v===0)return <div style={{...b,background:p.card,borderRadius:12,border:`1px solid ${p.bd}`,padding:"0 14px",display:"flex",alignItems:"center",gap:10,boxShadow:`0 4px 20px ${p.tx}08`}}><div style={{width:20,height:20,borderRadius:999,background:"#4CAF5018"}}/><T k="label" s={{fontSize:12,color:p.tx,fontWeight:500}}>Changes saved</T></div>;
    if(v===1)return <div style={{...b,background:p.tx,borderRadius:8,padding:"0 14px",display:"flex",alignItems:"center",gap:10}}><T k="label" s={{fontSize:12,color:p.bg,fontWeight:500}}>Changes saved</T><T k="action" s={{marginLeft:"auto",fontSize:11,color:p.bg,opacity:.45}}>Undo</T></div>;
    if(v===2)return <div style={{...b,background:p.card,borderRadius:4,borderLeft:`3px solid #4CAF50`,padding:"0 14px",display:"flex",alignItems:"center",boxShadow:`0 2px 10px ${p.tx}06`}}><T k="label" s={{fontSize:12,color:p.tx,fontWeight:500}}>Changes saved</T></div>;
    return <div style={{...b,background:`${p.card}88`,backdropFilter:"blur(16px)",borderRadius:14,border:`1px solid ${p.ac}12`,padding:"0 14px",display:"flex",alignItems:"center",gap:10,boxShadow:`0 8px 32px ${p.tx}08`}}><div style={{width:20,height:20,borderRadius:999,background:"#4CAF5018"}}/><T k="label" s={{fontSize:12,color:p.tx,fontWeight:500}}>Changes saved</T></div>;
  }

  /* ---- PROGRESS ---- */
  if(type==="progress"){
    const rd=[999,4,0];
    return <div style={{...b,background:p.su,borderRadius:rd[v],overflow:"hidden"}}><div style={{width:"68%",height:"100%",background:v===1?`linear-gradient(90deg,${p.ac},${p.ac2})`:p.ac,borderRadius:rd[v]}}/></div>;
  }

  /* ---- MODAL ---- */
  if(type==="modal"){
    if(v===0)return <div style={{...b,background:p.card,borderRadius:16,border:`1px solid ${p.bd}`,boxShadow:`0 16px 48px ${p.tx}12`,padding:20,display:"flex",flexDirection:"column",gap:12}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><T k="title" s={{fontSize:15,fontWeight:600,color:p.tx}}>Confirm action</T><div style={{width:20,height:20,borderRadius:6,background:p.su,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:12,color:p.mu,lineHeight:1}}>×</span></div></div><T k="body" s={{flex:1,fontSize:11,color:p.mu,lineHeight:1.5}}>Are you sure you want to proceed? This action will apply your changes.</T><div style={{display:"flex",gap:8,justifyContent:"flex-end"}}><div style={{height:32,width:70,borderRadius:8,border:`1px solid ${p.bd}`,display:"flex",alignItems:"center",justifyContent:"center"}}><T k="cancel" s={{fontSize:11,color:p.mu,fontWeight:500}}>Cancel</T></div><div style={{height:32,width:70,borderRadius:8,background:p.ac,display:"flex",alignItems:"center",justifyContent:"center"}}><T k="confirm" s={{fontSize:11,color:"#fff",fontWeight:500}}>Confirm</T></div></div></div>;
    if(v===1)return <div style={{...b,background:p.card,borderRadius:12,border:`1px solid ${p.bd}`,padding:24,display:"flex",flexDirection:"column",gap:12,alignItems:"center",textAlign:"center"}}><Img k="icon" s={{width:40,height:40,borderRadius:999,background:p.ac+"14",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:18,color:p.ac}}>?</span></Img><T k="title" s={{fontSize:15,fontWeight:600,color:p.tx}}>Are you sure?</T><T k="body" s={{fontSize:11,color:p.mu,lineHeight:1.5}}>This cannot be undone.</T><div style={{display:"flex",gap:8}}><div style={{height:32,width:80,borderRadius:8,border:`1px solid ${p.bd}`,display:"flex",alignItems:"center",justifyContent:"center"}}><T k="cancel" s={{fontSize:11,color:p.mu}}>Cancel</T></div><div style={{height:32,width:80,borderRadius:8,background:p.ac,display:"flex",alignItems:"center",justifyContent:"center"}}><T k="confirm" s={{fontSize:11,color:"#fff",fontWeight:500}}>Confirm</T></div></div></div>;
    return <div style={{...b,background:p.card,borderRadius:"16px 16px 0 0",borderTop:`1px solid ${p.bd}`,boxShadow:`0 -8px 32px ${p.tx}08`,padding:20,display:"flex",flexDirection:"column",gap:10}}><div style={{width:36,height:4,borderRadius:2,background:p.mu+"30",alignSelf:"center",marginBottom:4}}/><T k="title" s={{fontSize:15,fontWeight:600,color:p.tx}}>Select option</T><T k="body" s={{flex:1,fontSize:11,color:p.mu,lineHeight:1.5}}>Choose from the options below to continue.</T><div style={{height:36,borderRadius:10,background:p.ac,display:"flex",alignItems:"center",justifyContent:"center"}}><T k="confirm" s={{fontSize:12,color:"#fff",fontWeight:500}}>Continue</T></div></div>;
  }

  /* ---- SIDEBAR ---- */
  if(type==="sidebar"){
    const items=["Dashboard","Analytics","Settings","Users"];
    const Item=({t,k,active,iconOnly})=><div style={{padding:iconOnly?"8px":"7px 12px",borderRadius:8,background:active?p.ac+"14":"transparent",display:"flex",alignItems:"center",gap:10}}><div style={{width:16,height:16,borderRadius:4,background:active?p.ac+"40":p.mu+"20",flexShrink:0}}/>{!iconOnly&&<T k={k} s={{fontSize:12,color:active?p.ac:p.mu,fontWeight:active?500:400}}>{t}</T>}</div>;
    if(v===0)return <div style={{...b,background:p.card,borderRadius:12,border:`1px solid ${p.bd}`,padding:12,display:"flex",flexDirection:"column",gap:2}}><T k="brand" s={{fontSize:13,fontWeight:600,color:p.tx,padding:"2px 12px 10px"}}>Brand</T>{items.map((t,i)=><Item key={i} t={t} k={`nav${i}`} active={i===0}/>)}<div style={{marginTop:"auto",height:1,background:p.bd}}/><Item t="Log out" k="logout" active={false}/></div>;
    if(v===1)return <div style={{...b,background:p.card,borderRadius:12,border:`1px solid ${p.bd}`,padding:8,display:"flex",flexDirection:"column",gap:4,alignItems:"center",width:"100%"}}><Img k="logo" s={{width:24,height:24,borderRadius:8,background:p.ac+"20",marginBottom:8}}/>{items.map((t,i)=><Item key={i} t={t} k={`nav${i}`} active={i===0} iconOnly/>)}</div>;
    return <div style={{...b,background:p.card,borderRadius:12,border:`1px solid ${p.bd}`,padding:12,display:"flex",flexDirection:"column",gap:2}}><T k="brand" s={{fontSize:13,fontWeight:600,color:p.tx,padding:"2px 12px 8px"}}>Brand</T><T k="section1" s={{fontSize:9,color:p.mu,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.08em",padding:"6px 12px 2px"}}>Main</T>{items.slice(0,2).map((t,i)=><Item key={i} t={t} k={`nav${i}`} active={i===0}/>)}<T k="section2" s={{fontSize:9,color:p.mu,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.08em",padding:"10px 12px 2px"}}>System</T>{items.slice(2).map((t,i)=><Item key={i+2} t={t} k={`nav${i+2}`} active={false}/>)}</div>;
  }

  /* ---- TABLE ---- */
  if(type==="table"){
    const cols=["Name","Status","Amount"];
    const rows=[["Alice","Active","$1,200"],["Bob","Pending","$840"],["Carol","Active","$2,100"]];
    const hst={fontSize:10,fontWeight:600,color:p.mu,textTransform:"uppercase",letterSpacing:"0.05em"};
    const cst={fontSize:11,color:p.tx};
    const cst2={fontSize:11,color:p.mu};
    if(v===0)return <div style={{...b,background:p.card,borderRadius:12,border:`1px solid ${p.bd}`,overflow:"hidden",display:"flex",flexDirection:"column"}}><div style={{display:"flex",padding:"10px 14px",borderBottom:`1px solid ${p.bd}`}}>{cols.map((c,i)=><div key={i} style={{flex:i===0?2:1}}><T k={`h${i}`} s={hst}>{c}</T></div>)}</div>{rows.map((r,ri)=><div key={ri} style={{display:"flex",padding:"8px 14px",background:ri%2===0?"transparent":p.su}}>{r.map((c,ci)=><div key={ci} style={{flex:ci===0?2:1}}><T k={`r${ri}c${ci}`} s={ci===0?cst:cst2}>{c}</T></div>)}</div>)}</div>;
    if(v===1)return <div style={{...b,background:p.card,borderRadius:8,border:`1px solid ${p.bd}`,overflow:"hidden",display:"flex",flexDirection:"column"}}><div style={{display:"flex",padding:"10px 14px",borderBottom:`2px solid ${p.bd}`}}>{cols.map((c,i)=><div key={i} style={{flex:i===0?2:1,borderRight:i<2?`1px solid ${p.bd}`:"none",paddingRight:8}}><T k={`h${i}`} s={hst}>{c}</T></div>)}</div>{rows.map((r,ri)=><div key={ri} style={{display:"flex",padding:"8px 14px",borderBottom:ri<2?`1px solid ${p.bd}`:"none"}}>{r.map((c,ci)=><div key={ci} style={{flex:ci===0?2:1,borderRight:ci<2?`1px solid ${p.bd}`:"none",paddingRight:8}}><T k={`r${ri}c${ci}`} s={ci===0?cst:cst2}>{c}</T></div>)}</div>)}</div>;
    return <div style={{...b,display:"flex",flexDirection:"column"}}><div style={{display:"flex",padding:"8px 4px",borderBottom:`1px solid ${p.bd}`}}>{cols.map((c,i)=><div key={i} style={{flex:i===0?2:1}}><T k={`h${i}`} s={hst}>{c}</T></div>)}</div>{rows.map((r,ri)=><div key={ri} style={{display:"flex",padding:"8px 4px",borderBottom:ri<2?`1px solid ${p.bd}`:"none"}}>{r.map((c,ci)=><div key={ci} style={{flex:ci===0?2:1}}><T k={`r${ri}c${ci}`} s={ci===0?cst:cst2}>{c}</T></div>)}</div>)}</div>;
  }

  /* ---- ACCORDION ---- */
  if(type==="accordion"){
    const items=[{q:"What is this?",open:true},{q:"How does it work?",open:false},{q:"Pricing plans?",open:false}];
    const chev=(o)=><span style={{fontSize:11,color:p.mu,transform:o?"rotate(90deg)":"rotate(0)",display:"inline-block",transition:"transform .2s"}}>›</span>;
    if(v===0)return <div style={{...b,display:"flex",flexDirection:"column"}}>{items.map((it,i)=><div key={i} style={{borderBottom:i<2?`1px solid ${p.bd}`:"none",padding:"10px 0"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><T k={`q${i}`} s={{fontSize:12,fontWeight:500,color:p.tx}}>{it.q}</T>{chev(it.open)}</div>{it.open&&<div style={{marginTop:6}}><T k={`a${i}`} s={{fontSize:11,color:p.mu,lineHeight:1.5}}>This is the answer to the question above.</T></div>}</div>)}</div>;
    if(v===1)return <div style={{...b,display:"flex",flexDirection:"column",gap:6}}>{items.map((it,i)=><div key={i} style={{background:it.open?p.su:p.card,border:`1px solid ${p.bd}`,borderRadius:10,padding:"10px 12px"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><T k={`q${i}`} s={{fontSize:12,fontWeight:500,color:p.tx}}>{it.q}</T>{chev(it.open)}</div>{it.open&&<div style={{marginTop:6}}><T k={`a${i}`} s={{fontSize:11,color:p.mu,lineHeight:1.5}}>This is the answer to the question above.</T></div>}</div>)}</div>;
    return <div style={{...b,display:"flex",flexDirection:"column"}}>{items.map((it,i)=><div key={i} style={{padding:"10px 0",borderBottom:i<2?`1px solid ${p.bd}`:"none"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><T k={`q${i}`} s={{fontSize:12,fontWeight:it.open?600:400,color:it.open?p.ac:p.tx}}>{it.q}</T><span style={{fontSize:13,color:p.mu}}>{it.open?"−":"+"}</span></div>{it.open&&<div style={{marginTop:6}}><T k={`a${i}`} s={{fontSize:11,color:p.mu,lineHeight:1.5}}>This is the answer to the question above.</T></div>}</div>)}</div>;
  }

  /* ---- FOOTER ---- */
  if(type==="footer"){
    const cols=[["Product","Features","Pricing","Docs"],["Company","About","Blog","Careers"]];
    if(v===0)return <div style={{...b,background:p.card,borderRadius:12,border:`1px solid ${p.bd}`,padding:"16px 20px",display:"flex",gap:24}}><div style={{flex:1,display:"flex",flexDirection:"column",gap:4}}><T k="brand" s={{fontSize:12,fontWeight:600,color:p.tx,marginBottom:4}}>Brand</T><T k="tagline" s={{fontSize:9,color:p.mu,lineHeight:1.4}}>Building better products</T></div>{cols.map((col,ci)=><div key={ci} style={{flex:1,display:"flex",flexDirection:"column",gap:4}}><T k={`col${ci}`} s={{fontSize:10,fontWeight:600,color:p.tx,marginBottom:2}}>{col[0]}</T>{col.slice(1).map((l,li)=><T key={li} k={`c${ci}l${li}`} s={{fontSize:10,color:p.mu}}>{l}</T>)}</div>)}</div>;
    if(v===1)return <div style={{...b,borderTop:`1px solid ${p.bd}`,padding:"14px 20px",display:"flex",alignItems:"center",justifyContent:"space-between"}}><T k="brand" s={{fontSize:12,fontWeight:600,color:p.tx}}>Tasteprint</T><div style={{display:"flex",gap:16}}>{["Privacy","Terms","Contact"].map((l,i)=><T key={i} k={`link${i}`} s={{fontSize:10,color:p.mu}}>{l}</T>)}</div><T k="copy" s={{fontSize:9,color:p.mu,opacity:.5}}>© 2026</T></div>;
    return <div style={{...b,background:p.tx,borderRadius:12,padding:"16px 20px",display:"flex",alignItems:"center",justifyContent:"space-between"}}><T k="brand" s={{fontSize:13,fontWeight:600,color:p.bg}}>Brand</T><div style={{display:"flex",gap:16}}>{["About","Blog","Contact"].map((l,i)=><T key={i} k={`link${i}`} s={{fontSize:10,color:p.bg,opacity:.5}}>{l}</T>)}</div><div style={{display:"flex",gap:6}}>{[0,1,2].map(i=><Img key={i} k={`social${i}`} s={{width:20,height:20,borderRadius:999,background:`${p.bg}15`}}/>)}</div></div>;
  }

  /* ---- BENTO GRID ---- */
  if(type==="bento-grid"){
    const cell=(r,idx)=>{
      const imgSrc=texts[`img${idx}`];
      const dropImg=e=>{e.preventDefault();e.stopPropagation();if(!editable)return;const file=(e.dataTransfer?.files||[])[0];if(!file||!file.type.startsWith("image/"))return;const rd=new FileReader();rd.onload=rr=>{onText?.(`img${idx}`,rr.target.result)};rd.readAsDataURL(file)};
      const replaceImg=()=>{if(!editable||!imgSrc)return;const inp=document.createElement("input");inp.type="file";inp.accept="image/*";inp.onchange=ev=>{const file=ev.target.files[0];if(!file)return;const rd=new FileReader();rd.onload=rr=>{onText?.(`img${idx}`,rr.target.result)};rd.readAsDataURL(file)};inp.click()};
      return <div style={{background:p.su,borderRadius:12,border:`1px solid ${p.bd}`,overflow:"hidden",position:"relative",display:"flex",alignItems:"center",justifyContent:"center",padding:12,...r}} onDragOver={e=>e.preventDefault()} onDrop={dropImg}>
        {imgSrc&&<img src={imgSrc} onClick={replaceImg} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",cursor:editable?"pointer":"default"}}/>}
        <T k={`t${idx}`} s={{position:"relative",zIndex:1,fontSize:12,color:imgSrc?"#fff":p.mu,fontWeight:500,textShadow:imgSrc?"0 1px 4px rgba(0,0,0,.5)":"none",textAlign:"center"}}>{" "}</T>
      </div>;
    };
    if(v===0)return <div style={{...b,display:"grid",gridTemplateColumns:"1fr 1fr",gridTemplateRows:"1fr 1fr",gap:8}}>{cell({},0)}{cell({},1)}{cell({},2)}{cell({},3)}</div>;
    if(v===1)return <div style={{...b,display:"grid",gridTemplateColumns:"1.4fr 1fr",gridTemplateRows:"1fr 1fr",gap:8}}>{cell({gridRow:"1/3"},0)}{cell({},1)}{cell({},2)}</div>;
    return <div style={{...b,display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gridTemplateRows:"1fr 1fr",gap:8}}>{cell({gridColumn:"1/3"},0)}{cell({},1)}{cell({},2)}{cell({gridColumn:"2/4"},3)}</div>;
  }

  /* ---- DROPDOWN ---- */
  if(type==="dropdown"){
    const items=["Option one","Option two","Option three"];
    if(v===0)return <div style={{...b,display:"flex",flexDirection:"column"}}><div style={{height:36,background:p.card,borderRadius:10,border:`1px solid ${p.bd}`,padding:"0 12px",display:"flex",alignItems:"center",justifyContent:"space-between"}}><T k="sel" s={{fontSize:12,color:p.tx}}>Select...</T><span style={{fontSize:10,color:p.mu}}>▾</span></div><div style={{marginTop:4,background:p.card,borderRadius:10,border:`1px solid ${p.bd}`,boxShadow:`0 8px 24px ${p.tx}08`,overflow:"hidden"}}>{items.map((it,i)=><div key={i} style={{padding:"8px 12px",background:i===0?p.ac+"12":"transparent"}}><T k={`o${i}`} s={{fontSize:12,color:i===0?p.ac:p.tx}}>{it}</T></div>)}</div></div>;
    if(v===1)return <div style={{...b,display:"flex",flexDirection:"column"}}><div style={{height:36,borderBottom:`1.5px solid ${p.bd}`,padding:"0 4px",display:"flex",alignItems:"center",justifyContent:"space-between"}}><T k="sel" s={{fontSize:12,color:p.tx}}>Select...</T><span style={{fontSize:10,color:p.mu}}>▾</span></div><div style={{marginTop:4,background:p.card,border:`1px solid ${p.bd}`,overflow:"hidden"}}>{items.map((it,i)=><div key={i} style={{padding:"8px 12px",borderBottom:i<2?`1px solid ${p.bd}`:"none"}}><T k={`o${i}`} s={{fontSize:12,color:p.tx}}>{it}</T></div>)}</div></div>;
    return <div style={{...b,display:"flex",flexDirection:"column"}}><div style={{height:36,background:p.su,borderRadius:999,padding:"0 14px",display:"flex",alignItems:"center",justifyContent:"space-between"}}><T k="sel" s={{fontSize:12,color:p.tx}}>Select...</T><span style={{fontSize:10,color:p.mu}}>▾</span></div><div style={{marginTop:4,background:p.card,borderRadius:14,border:`1px solid ${p.bd}`,boxShadow:`0 8px 24px ${p.tx}08`,overflow:"hidden"}}>{items.map((it,i)=><div key={i} style={{padding:"8px 14px",borderRadius:8,margin:2,background:i===0?p.ac+"12":"transparent"}}><T k={`o${i}`} s={{fontSize:12,color:i===0?p.ac:p.tx}}>{it}</T></div>)}</div></div>;
  }

  /* ---- SELECT ---- */
  if(type==="select"){
    if(v===0)return <div style={{...b,background:p.card,borderRadius:10,border:`1.5px solid ${p.bd}`,padding:"0 12px",display:"flex",alignItems:"center",justifyContent:"space-between"}}><T k="val" s={{fontSize:13,color:p.tx}}>Choose option</T><span style={{fontSize:10,color:p.mu}}>▾</span></div>;
    if(v===1)return <div style={{...b,background:p.su,borderRadius:999,padding:"0 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}><T k="val" s={{fontSize:13,color:p.tx}}>Choose option</T><span style={{fontSize:10,color:p.mu}}>▾</span></div>;
    return <div style={{...b,borderBottom:`2px solid ${p.ac}30`,padding:"0 4px",display:"flex",alignItems:"center",justifyContent:"space-between"}}><T k="val" s={{fontSize:13,color:p.tx}}>Choose option</T><span style={{fontSize:10,color:p.mu}}>▾</span></div>;
  }

  /* ---- CHECKBOX ---- */
  if(type==="checkbox"){
    const items=[{label:"Option A",checked:true},{label:"Option B",checked:false},{label:"Option C",checked:false}];
    const box=(checked,round)=><div style={{width:16,height:16,borderRadius:round?999:4,border:checked?`none`:`1.5px solid ${p.bd}`,background:checked?p.ac:p.card,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{checked&&<svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"><path d="M2 5l2.5 2.5L8 3"/></svg>}</div>;
    if(v===0)return <div style={{...b,display:"flex",flexDirection:"column",gap:8,justifyContent:"center"}}>{items.map((it,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:8}}>{box(it.checked,false)}<T k={`l${i}`} s={{fontSize:12,color:it.checked?p.tx:p.mu}}>{it.label}</T></div>)}</div>;
    if(v===1)return <div style={{...b,display:"flex",flexDirection:"column",gap:8,justifyContent:"center"}}>{items.map((it,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:8}}>{box(it.checked,true)}<T k={`l${i}`} s={{fontSize:12,color:it.checked?p.tx:p.mu}}>{it.label}</T></div>)}</div>;
    return <div style={{...b,display:"flex",flexDirection:"column",gap:4,justifyContent:"center"}}>{items.map((it,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 10px",borderRadius:8,background:it.checked?p.ac+"12":"transparent"}}><div style={{width:32,height:18,borderRadius:999,background:it.checked?p.ac:p.mu+"30",padding:2,display:"flex",alignItems:it.checked?"center":"center",justifyContent:it.checked?"flex-end":"flex-start"}}><div style={{width:14,height:14,borderRadius:999,background:"#fff",boxShadow:"0 1px 2px rgba(0,0,0,.1)"}}/></div><T k={`l${i}`} s={{fontSize:12,color:it.checked?p.tx:p.mu}}>{it.label}</T></div>)}</div>;
  }

  /* ---- SLIDER ---- */
  if(type==="slider"){
    const pct=65;
    if(v===0)return <div style={{...b,display:"flex",alignItems:"center"}}><div style={{width:"100%",height:6,borderRadius:999,background:p.su,position:"relative"}}><div style={{width:`${pct}%`,height:"100%",borderRadius:999,background:p.ac}}/><div style={{position:"absolute",left:`${pct}%`,top:"50%",transform:"translate(-50%,-50%)",width:16,height:16,borderRadius:999,background:p.card,border:`2px solid ${p.ac}`,boxShadow:`0 1px 4px ${p.tx}12`}}/></div></div>;
    if(v===1)return <div style={{...b,display:"flex",alignItems:"center"}}><div style={{width:"100%",height:3,borderRadius:999,background:p.su,position:"relative"}}><div style={{width:`${pct}%`,height:"100%",borderRadius:999,background:p.ac}}/><div style={{position:"absolute",left:`${pct}%`,top:"50%",transform:"translate(-50%,-50%)",width:12,height:12,borderRadius:999,background:p.ac}}/></div></div>;
    return <div style={{...b,display:"flex",alignItems:"center"}}><div style={{width:"100%",height:6,borderRadius:999,background:p.su,position:"relative",display:"flex",alignItems:"center"}}>{[0,25,50,75,100].map(s=><div key={s} style={{position:"absolute",left:`${s}%`,width:2,height:10,background:p.mu+"30",borderRadius:1,transform:"translateX(-50%)"}}/>)}<div style={{width:`${pct}%`,height:"100%",borderRadius:999,background:p.ac,position:"absolute"}}/><div style={{position:"absolute",left:`${pct}%`,top:"50%",transform:"translate(-50%,-50%)",width:14,height:14,borderRadius:4,background:p.ac}}/></div></div>;
  }

  /* ---- ALERT ---- */
  if(type==="alert"){
    const configs=[
      {bg:"#EBF5FF",bc:"#3B82F6",ic:"ℹ",tx:"#1E40AF",label:"Info: Check the docs for details."},
      {bg:"#FFF8E1",bc:"#F59E0B",ic:"⚠",tx:"#92400E",label:"Warning: This action cannot be undone."},
      {bg:"#ECFDF5",bc:"#10B981",ic:"✓",tx:"#065F46",label:"Success: Your changes have been saved."},
      {bg:"#FEF2F2",bc:"#EF4444",ic:"✕",tx:"#991B1B",label:"Error: Something went wrong."},
    ];
    const c=configs[v]||configs[0];
    return <div style={{...b,background:c.bg,borderRadius:10,borderLeft:`3px solid ${c.bc}`,padding:"0 14px",display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:14,color:c.bc}}>{c.ic}</span><T k="label" s={{fontSize:12,color:c.tx,fontWeight:500}}>{c.label}</T></div>;
  }

  /* ---- PAGINATION ---- */
  if(type==="pagination"){
    if(v===0)return <div style={{...b,display:"flex",alignItems:"center",justifyContent:"center",gap:4}}>{["‹",1,2,3,"…",8,"›"].map((pg,i)=><div key={i} style={{width:28,height:28,borderRadius:8,background:pg===2?p.ac:"transparent",border:typeof pg==="number"&&pg!==2?`1px solid ${p.bd}`:"none",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}><T k={`p${i}`} s={{fontSize:11,color:pg===2?"#fff":p.mu,fontWeight:pg===2?600:400}}>{pg}</T></div>)}</div>;
    if(v===1)return <div style={{...b,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>{[1,2,3,4,5].map((pg,i)=><div key={i} style={{width:8,height:8,borderRadius:999,background:pg===2?p.ac:p.mu+"30"}}/>)}</div>;
    return <div style={{...b,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 8px"}}><T k="prev" s={{fontSize:11,color:p.mu}}>← Previous</T><T k="info" s={{fontSize:11,color:p.mu}}>Page 2 of 8</T><T k="next" s={{fontSize:11,color:p.ac,fontWeight:500}}>Next →</T></div>;
  }

  /* ---- PRICING CARD ---- */
  if(type==="pricing-card"){
    const features=["10 projects","5GB storage","Priority support","Custom domain"];
    if(v===0)return <div style={{...b,background:p.card,borderRadius:16,border:`1px solid ${p.bd}`,padding:24,display:"flex",flexDirection:"column",gap:12}}><T k="plan" s={{fontSize:11,color:p.mu,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em"}}>Pro</T><div style={{display:"flex",alignItems:"baseline",gap:2}}><T k="price" s={{fontSize:32,fontWeight:700,color:p.tx}}>$29</T><T k="period" s={{fontSize:12,color:p.mu}}>/mo</T></div><div style={{height:1,background:p.bd,margin:"4px 0"}}/><div style={{flex:1,display:"flex",flexDirection:"column",gap:8}}>{features.map((f,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:14,height:14,borderRadius:999,background:p.ac+"18",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:8,color:p.ac}}>✓</span></div><T k={`f${i}`} s={{fontSize:12,color:p.tx}}>{f}</T></div>)}</div><div style={{height:38,borderRadius:10,background:p.ac,display:"flex",alignItems:"center",justifyContent:"center"}}><T k="cta" s={{fontSize:12,color:"#fff",fontWeight:600}}>Get started</T></div></div>;
    if(v===1)return <div style={{...b,background:p.ac,borderRadius:16,padding:24,display:"flex",flexDirection:"column",gap:12,boxShadow:`0 8px 32px ${p.ac}30`}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><T k="plan" s={{fontSize:11,color:"#fff",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em",opacity:.8}}>Pro</T><div style={{background:"#fff22",borderRadius:999,padding:"2px 8px"}}><T k="badge" s={{fontSize:9,color:"#fff",fontWeight:600}}>POPULAR</T></div></div><div style={{display:"flex",alignItems:"baseline",gap:2}}><T k="price" s={{fontSize:32,fontWeight:700,color:"#fff"}}>$29</T><T k="period" s={{fontSize:12,color:"#fff",opacity:.6}}>/mo</T></div><div style={{height:1,background:"#fff2",margin:"4px 0"}}/><div style={{flex:1,display:"flex",flexDirection:"column",gap:8}}>{features.map((f,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:10,color:"#fff",opacity:.7}}>✓</span><T k={`f${i}`} s={{fontSize:12,color:"#fff",opacity:.9}}>{f}</T></div>)}</div><div style={{height:38,borderRadius:10,background:"#fff",display:"flex",alignItems:"center",justifyContent:"center"}}><T k="cta" s={{fontSize:12,color:p.ac,fontWeight:600}}>Get started</T></div></div>;
    return <div style={{...b,background:p.card,borderRadius:12,padding:24,display:"flex",flexDirection:"column",gap:14}}><T k="plan" s={{fontSize:16,fontWeight:600,color:p.tx}}>Pro</T><div style={{display:"flex",alignItems:"baseline",gap:2}}><T k="price" s={{fontSize:28,fontWeight:600,color:p.tx}}>$29</T><T k="period" s={{fontSize:12,color:p.mu}}>/mo</T></div><div style={{flex:1,display:"flex",flexDirection:"column",gap:6}}>{features.map((f,i)=><T key={i} k={`f${i}`} s={{fontSize:12,color:p.mu}}>• {f}</T>)}</div><div style={{height:36,borderRadius:8,border:`1.5px solid ${p.ac}`,display:"flex",alignItems:"center",justifyContent:"center"}}><T k="cta" s={{fontSize:12,color:p.ac,fontWeight:500}}>Choose plan</T></div></div>;
  }

  /* ---- TOOLTIP ---- */
  if(type==="tooltip"){
    if(v===0)return <div style={{...b,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-end",gap:4}}><div style={{background:p.card,borderRadius:8,border:`1px solid ${p.bd}`,padding:"6px 12px",boxShadow:`0 4px 12px ${p.tx}08`}}><T k="label" s={{fontSize:11,color:p.tx}}>Tooltip text</T></div><div style={{width:8,height:8,background:p.card,border:`1px solid ${p.bd}`,borderTop:"none",borderLeft:"none",transform:"rotate(45deg)",marginTop:-6}}/></div>;
    if(v===1)return <div style={{...b,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-end",gap:4}}><div style={{background:p.tx,borderRadius:6,padding:"6px 12px"}}><T k="label" s={{fontSize:11,color:p.bg}}>Tooltip text</T></div><div style={{width:8,height:8,background:p.tx,transform:"rotate(45deg)",marginTop:-6}}/></div>;
    return <div style={{...b,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-end",gap:0}}><div style={{background:p.card,borderRadius:8,border:`1px solid ${p.bd}`,padding:"6px 12px",boxShadow:`0 4px 12px ${p.tx}08`,position:"relative"}}><T k="label" s={{fontSize:11,color:p.tx}}>Tooltip text</T></div><svg width="12" height="6" viewBox="0 0 12 6" style={{marginTop:-1}}><path d="M0 0L6 6L12 0" fill={p.card} stroke={p.bd} strokeWidth="1"/></svg></div>;
  }

  /* ---- BREADCRUMB ---- */
  if(type==="breadcrumb"){
    const items=["Home","Products","Details"];
    const sep=v===0?" / ":v===1?" › ":"  •  ";
    return <div style={{...b,display:"flex",alignItems:"center",gap:0}}>{items.map((it,i)=><React.Fragment key={i}>{i>0&&<span style={{fontSize:11,color:p.mu,opacity:.4}}>{sep}</span>}<T k={`b${i}`} s={{fontSize:12,color:i===items.length-1?p.tx:p.mu,fontWeight:i===items.length-1?500:400}}>{it}</T></React.Fragment>)}</div>;
  }

  /* ---- SKELETON ---- */
  if(type==="skeleton"){
    const shimmer={background:`linear-gradient(90deg,${p.su} 25%,${p.bd}40 50%,${p.su} 75%)`,backgroundSize:"200% 100%",borderRadius:8};
    if(v===0)return <div style={{...b,background:p.card,borderRadius:14,border:`1px solid ${p.bd}`,padding:16,display:"flex",flexDirection:"column",gap:10}}><div style={{...shimmer,height:14,width:"50%"}}/><div style={{...shimmer,height:10,width:"80%"}}/><div style={{...shimmer,height:10,width:"65%"}}/><div style={{...shimmer,height:40,width:"100%",borderRadius:10,marginTop:4}}/></div>;
    if(v===1)return <div style={{...b,display:"flex",flexDirection:"column",gap:10}}>{[0,1,2].map(i=><div key={i} style={{display:"flex",gap:10,alignItems:"center"}}><div style={{...shimmer,width:36,height:36,borderRadius:999,flexShrink:0}}/><div style={{flex:1,display:"flex",flexDirection:"column",gap:6}}><div style={{...shimmer,height:10,width:`${60+i*10}%`}}/><div style={{...shimmer,height:8,width:`${80-i*10}%`}}/></div></div>)}</div>;
    return <div style={{...b,display:"flex",gap:14,alignItems:"center"}}><div style={{...shimmer,width:56,height:56,borderRadius:999,flexShrink:0}}/><div style={{flex:1,display:"flex",flexDirection:"column",gap:8}}><div style={{...shimmer,height:12,width:"40%"}}/><div style={{...shimmer,height:9,width:"70%"}}/><div style={{...shimmer,height:9,width:"55%"}}/></div></div>;
  }

  /* ---- CHART ---- */
  if(type==="chart"){
    if(v===0){const bars=[55,80,45,90,65,75];return <div style={{...b,background:p.card,borderRadius:14,border:`1px solid ${p.bd}`,padding:16,display:"flex",flexDirection:"column"}}><T k="title" s={{fontSize:12,fontWeight:600,color:p.tx,marginBottom:8}}>Chart title</T><div style={{flex:1,display:"flex",alignItems:"flex-end",gap:8,paddingBottom:4}}>{bars.map((h,i)=><div key={i} style={{flex:1,height:`${h}%`,background:i===3?p.ac:p.ac+"30",borderRadius:4}}/> )}</div></div>}
    if(v===1){const pts=[[0,60],[20,40],[40,65],[60,30],[80,55],[100,20]];const path="M"+pts.map(([x,y])=>`${x},${y}`).join(" L");return <div style={{...b,background:p.card,borderRadius:14,border:`1px solid ${p.bd}`,padding:16,display:"flex",flexDirection:"column"}}><T k="title" s={{fontSize:12,fontWeight:600,color:p.tx,marginBottom:8}}>Chart title</T><svg style={{flex:1,width:"100%"}} viewBox="0 0 100 80" preserveAspectRatio="none"><path d={path} fill="none" stroke={p.ac} strokeWidth="2" strokeLinejoin="round"/><path d={path+" L100,80 L0,80 Z"} fill={p.ac+"12"}/></svg></div>}
    const slices=[{pct:40,color:p.ac},{pct:25,color:p.ac2},{pct:20,color:p.mu+"50"},{pct:15,color:p.su}];
    let acc=0;return <div style={{...b,background:p.card,borderRadius:14,border:`1px solid ${p.bd}`,padding:16,display:"flex",flexDirection:"column",gap:8}}><T k="title" s={{fontSize:12,fontWeight:600,color:p.tx}}>Chart title</T><div style={{display:"flex",alignItems:"center",gap:16,flex:1}}><svg width="80" height="80" viewBox="0 0 80 80">{slices.map((s,i)=>{const start=acc;acc+=s.pct;const a1=(start/100)*Math.PI*2-Math.PI/2;const a2=((start+s.pct)/100)*Math.PI*2-Math.PI/2;const large=s.pct>50?1:0;return<path key={i} d={`M40,40 L${40+30*Math.cos(a1)},${40+30*Math.sin(a1)} A30,30 0 ${large},1 ${40+30*Math.cos(a2)},${40+30*Math.sin(a2)} Z`} fill={s.color}/>})}</svg><div style={{display:"flex",flexDirection:"column",gap:6}}>{slices.map((s,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:8,height:8,borderRadius:2,background:s.color}}/><T k={`leg${i}`} s={{fontSize:10,color:p.mu}}>{s.pct}%</T></div>)}</div></div></div>;
  }

  /* ---- TESTIMONIAL ---- */
  if(type==="testimonial"){
    if(v===0)return <div style={{...b,background:p.card,borderRadius:14,border:`1px solid ${p.bd}`,padding:18,display:"flex",flexDirection:"column",gap:10}}><span style={{fontSize:24,color:p.ac,opacity:.3,lineHeight:1}}>"</span><T k="quote" s={{fontSize:12,color:p.tx,lineHeight:1.5,fontStyle:"italic"}}>This product changed how we work. Highly recommend it.</T><div style={{display:"flex",alignItems:"center",gap:8,marginTop:"auto"}}><Img k="avatar" s={{width:28,height:28,borderRadius:999,background:p.ac+"20"}}/><div><T k="name" s={{fontSize:11,fontWeight:600,color:p.tx}}>Jane Doe</T><T k="role" s={{fontSize:10,color:p.mu,display:"block"}}>CEO, Acme</T></div></div></div>;
    if(v===1)return <div style={{...b,display:"flex",flexDirection:"column",gap:8,padding:"8px 0"}}><T k="quote" s={{fontSize:13,color:p.tx,lineHeight:1.5}}>This product changed how we work.</T><div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:4,height:4,borderRadius:999,background:p.ac}}/><T k="name" s={{fontSize:11,color:p.mu}}>Jane Doe, CEO</T></div></div>;
    return <div style={{...b,background:p.su,borderRadius:16,padding:16,display:"flex",flexDirection:"column",gap:8,position:"relative"}}><div style={{position:"absolute",top:8,right:14,fontSize:32,color:p.ac,opacity:.12,lineHeight:1}}>"</div><T k="quote" s={{fontSize:12,color:p.tx,lineHeight:1.5}}>This product changed how we work. Highly recommend it.</T><div style={{display:"flex",alignItems:"center",gap:8,marginTop:"auto"}}><Img k="avatar" s={{width:24,height:24,borderRadius:999,background:p.ac+"25"}}/><T k="name" s={{fontSize:11,fontWeight:500,color:p.tx}}>Jane Doe</T></div></div>;
  }

  /* ---- CMD PALETTE ---- */
  if(type==="cmd-palette"){
    const items=[{icon:"⌂",label:"Go to Dashboard"},{icon:"⚙",label:"Settings"},{icon:"?",label:"Help center"},{icon:"↗",label:"Open docs"}];
    if(v===0)return <div style={{...b,background:p.card,borderRadius:14,border:`1px solid ${p.bd}`,boxShadow:`0 16px 48px ${p.tx}12`,overflow:"hidden",display:"flex",flexDirection:"column"}}><div style={{padding:"10px 14px",borderBottom:`1px solid ${p.bd}`,display:"flex",alignItems:"center",gap:8}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={p.mu} strokeWidth="2" opacity=".3"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg><T k="search" s={{fontSize:12,color:p.mu,opacity:.4}}>Type a command...</T></div><div style={{flex:1,padding:4}}>{items.map((it,i)=><div key={i} style={{padding:"8px 10px",borderRadius:8,display:"flex",alignItems:"center",gap:10,background:i===0?p.ac+"10":"transparent"}}><span style={{fontSize:13,opacity:.5}}>{it.icon}</span><T k={`c${i}`} s={{fontSize:12,color:i===0?p.ac:p.tx}}>{it.label}</T>{i===0&&<span style={{marginLeft:"auto",fontSize:9,color:p.mu,opacity:.3}}>Enter ↵</span>}</div>)}</div></div>;
    if(v===1)return <div style={{...b,background:p.card,borderRadius:12,border:`1px solid ${p.bd}`,boxShadow:`0 8px 32px ${p.tx}08`,overflow:"hidden",display:"flex",flexDirection:"column"}}><div style={{padding:"10px 14px",borderBottom:`1px solid ${p.bd}`}}><T k="search" s={{fontSize:12,color:p.mu,opacity:.4}}>Search...</T></div><div style={{flex:1,padding:2}}>{items.map((it,i)=><div key={i} style={{padding:"8px 12px",display:"flex",alignItems:"center",gap:10,background:i===0?p.su:"transparent"}}><T k={`c${i}`} s={{fontSize:12,color:p.tx}}>{it.label}</T></div>)}</div></div>;
    return <div style={{...b,background:p.card,borderRadius:14,border:`1px solid ${p.bd}`,boxShadow:`0 16px 48px ${p.tx}12`,overflow:"hidden",display:"flex",flexDirection:"column"}}><div style={{padding:"10px 14px",borderBottom:`1px solid ${p.bd}`}}><T k="search" s={{fontSize:12,color:p.mu,opacity:.4}}>Type a command...</T></div><div style={{padding:4}}><div style={{fontSize:9,color:p.mu,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.08em",padding:"6px 10px 2px"}}>Navigation</div>{items.slice(0,2).map((it,i)=><div key={i} style={{padding:"8px 10px",borderRadius:8,display:"flex",alignItems:"center",gap:10,background:i===0?p.ac+"10":"transparent"}}><span style={{fontSize:13,opacity:.5}}>{it.icon}</span><T k={`c${i}`} s={{fontSize:12,color:p.tx}}>{it.label}</T></div>)}<div style={{fontSize:9,color:p.mu,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.08em",padding:"6px 10px 2px"}}>Help</div>{items.slice(2).map((it,i)=><div key={i+2} style={{padding:"8px 10px",borderRadius:8,display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:13,opacity:.5}}>{it.icon}</span><T k={`c${i+2}`} s={{fontSize:12,color:p.tx}}>{it.label}</T></div>)}</div></div>;
  }

  /* ---- STEPPER ---- */
  if(type==="stepper"){
    const steps=["Account","Details","Confirm"];
    const active=1;
    if(v===0)return <div style={{...b,display:"flex",alignItems:"center",justifyContent:"space-between"}}>{steps.map((s,i)=><React.Fragment key={i}>{i>0&&<div style={{flex:1,height:2,background:i<=active?p.ac:p.bd,margin:"0 8px"}}/>}<div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:24,height:24,borderRadius:999,background:i<active?p.ac:i===active?p.ac+"20":"transparent",border:i>active?`1.5px solid ${p.bd}`:"none",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:10,color:i<active?"#fff":i===active?p.ac:p.mu,fontWeight:600}}>{i<active?"✓":i+1}</span></div><T k={`s${i}`} s={{fontSize:11,color:i<=active?p.tx:p.mu,fontWeight:i===active?500:400}}>{s}</T></div></React.Fragment>)}</div>;
    if(v===1)return <div style={{...b,display:"flex",flexDirection:"column",gap:0,justifyContent:"center"}}>{steps.map((s,i)=><div key={i} style={{display:"flex",gap:10}}><div style={{display:"flex",flexDirection:"column",alignItems:"center"}}><div style={{width:20,height:20,borderRadius:999,background:i<=active?p.ac:p.su,border:i>active?`1.5px solid ${p.bd}`:"none",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:9,color:i<=active?"#fff":p.mu,fontWeight:600}}>{i<active?"✓":i+1}</span></div>{i<2&&<div style={{width:2,height:16,background:i<active?p.ac:p.bd}}/>}</div><T k={`s${i}`} s={{fontSize:11,color:i<=active?p.tx:p.mu,fontWeight:i===active?500:400,paddingTop:2}}>{s}</T></div>)}</div>;
    return <div style={{...b,display:"flex",alignItems:"center",justifyContent:"center",gap:12}}>{steps.map((s,i)=><React.Fragment key={i}>{i>0&&<div style={{width:20,height:1,background:p.bd}}/>}<div style={{width:10,height:10,borderRadius:999,background:i<=active?p.ac:p.bd}}/></React.Fragment>)}</div>;
  }

  /* ---- TIMELINE ---- */
  if(type==="timeline"){
    const events=[{title:"Project started",desc:"Initial setup complete"},{title:"Design review",desc:"Approved by team"},{title:"Launch",desc:"Coming soon"}];
    if(v===0)return <div style={{...b,display:"flex",flexDirection:"column",gap:0}}>{events.map((ev,i)=><div key={i} style={{display:"flex",gap:12,paddingBottom:i<2?16:0}}><div style={{display:"flex",flexDirection:"column",alignItems:"center"}}><div style={{width:10,height:10,borderRadius:999,background:i===0?p.ac:p.su,border:`2px solid ${i===0?p.ac:p.bd}`,flexShrink:0}}/>{i<2&&<div style={{width:2,flex:1,background:p.bd}}/>}</div><div><T k={`t${i}`} s={{fontSize:12,fontWeight:500,color:p.tx}}>{ev.title}</T><T k={`d${i}`} s={{fontSize:10,color:p.mu,display:"block",marginTop:2}}>{ev.desc}</T></div></div>)}</div>;
    if(v===1)return <div style={{...b,display:"flex",flexDirection:"column",gap:0}}>{events.map((ev,i)=><div key={i} style={{display:"flex",gap:0,paddingBottom:i<2?12:0}}><div style={{flex:1,textAlign:"right",paddingRight:16}}>{i%2===0&&<><T k={`t${i}`} s={{fontSize:12,fontWeight:500,color:p.tx}}>{ev.title}</T><T k={`d${i}`} s={{fontSize:10,color:p.mu,display:"block"}}>{ev.desc}</T></>}</div><div style={{display:"flex",flexDirection:"column",alignItems:"center"}}><div style={{width:8,height:8,borderRadius:999,background:p.ac,flexShrink:0}}/>{i<2&&<div style={{width:1,flex:1,background:p.bd}}/>}</div><div style={{flex:1,paddingLeft:16}}>{i%2===1&&<><T k={`t${i}`} s={{fontSize:12,fontWeight:500,color:p.tx}}>{ev.title}</T><T k={`d${i}`} s={{fontSize:10,color:p.mu,display:"block"}}>{ev.desc}</T></>}</div></div>)}</div>;
    return <div style={{...b,display:"flex",flexDirection:"column",gap:12}}>{events.map((ev,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:6,height:6,borderRadius:999,background:i===0?p.ac:p.mu+"40",flexShrink:0}}/><T k={`t${i}`} s={{fontSize:12,color:i===0?p.tx:p.mu}}>{ev.title}</T></div>)}</div>;
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
  const [future,setFuture]=useState([]);
  const [rsz,setRsz]=useState(null);
  const [expCat,setExpCat]=useState("Structure");
  const [prefV,setPrefV]=useState(()=>load("prefV",{}));
  const [cam,setCam]=useState({x:0,y:0,z:1});
  const [pan,setPan]=useState(null);
  const [selFont,setSelFont]=useState(null);
  const [device,setDevice]=useState("free");
  const cRef=useRef(null);
  const dRef=useRef(null);
  const dirtyText=useRef(null);
  const camRef=useRef(cam);
  camRef.current=cam;

  /* ---- PERSIST ---- */
  useEffect(()=>{
    localStorage.setItem(STORE_KEY,JSON.stringify({shapes,pal,taste,prefV,gest}));
  },[shapes,pal,taste,prefV,gest]);

  /* ---- EXPORT / IMPORT ---- */
  const exportJSON=useCallback(()=>{
    flushDirtyText();
    const data=JSON.stringify({shapes,pal,taste,prefV,gest},null,2);
    const blob=new Blob([data],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;a.download="tasteprint-layout.json";a.click();
    URL.revokeObjectURL(url);
  },[shapes,pal,taste,prefV,gest,flushDirtyText]);

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

  const exportPng=useCallback(()=>{
    flushDirtyText();
    const el=cRef.current;if(!el)return;
    const prev=sel;setSel(null);
    requestAnimationFrame(()=>{
      toPng(el,{pixelRatio:2,cacheBust:true}).then(url=>{
        const a=document.createElement("a");a.href=url;a.download="tasteprint.png";a.click();
      }).catch(()=>{}).finally(()=>setSel(prev));
    });
  },[sel,flushDirtyText]);

  /* ---- CANVAS COORD HELPERS ---- */
  const toCanvas=useCallback((cx,cy)=>{
    const r=cRef.current.getBoundingClientRect();
    const c=camRef.current;
    return{x:(cx-r.left-c.x)/c.z,y:(cy-r.top-c.y)/c.z};
  },[]);

  const push=useCallback(ns=>{setHist(h=>[...h.slice(-40),shapes]);setFuture([]);setShapes(ns)},[shapes]);
  const undo=useCallback(()=>{if(!hist.length)return;setFuture(f=>[...f,shapes]);setShapes(hist[hist.length-1]);setHist(h=>h.slice(0,-1))},[hist,shapes]);
  const redo=useCallback(()=>{if(!future.length)return;setHist(h=>[...h,shapes]);setShapes(future[future.length-1]);setFuture(f=>f.slice(0,-1))},[future,shapes]);
  const clearAll=useCallback(()=>{push([]);setSel(null)},[push]);
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
    else if(vn.includes("glass"))nudge({complexity:.03,roundness:.02});
    else nudge({complexity:.01});
  },[shapes,nudge]);

  const updateText=useCallback((id,key,value)=>{
    setShapes(prev=>prev.map(s=>{
      if(s.id!==id)return s;
      const texts={...(s.texts||{})};
      if(value===null||value===undefined)delete texts[key];
      else texts[key]=value;
      return{...s,texts};
    }));
  },[]);

  const flushDirtyText=useCallback(()=>{
    if(!dirtyText.current)return;
    const{id,key}=dirtyText.current;
    const ce=document.querySelector(`[data-text-key="${key}"]`);
    if(ce)updateText(id,key,ce.innerHTML);
    dirtyText.current=null;
  },[updateText]);

  const cycleFont=useCallback((id,dir)=>{
    const ws=window.getSelection();
    if(ws&&!ws.isCollapsed&&ws.rangeCount>0){
      const range=ws.getRangeAt(0);
      const anc=range.commonAncestorContainer;
      const ceEl=(anc.nodeType===3?anc.parentElement:anc).closest?.("[contenteditable]");
      if(ceEl){
        const base=selFont!==null?selFont:(shapes.find(x=>x.id===id)?.font||0);
        let nf=(base+dir)%FONTS.length;if(nf<0)nf=FONTS.length-1;
        setSelFont(nf);
        const span=document.createElement("span");
        span.style.fontFamily=FONTS[nf].family;
        const frag=range.extractContents();
        span.appendChild(frag);
        range.insertNode(span);
        ws.removeAllRanges();
        const nr=document.createRange();nr.selectNodeContents(span);ws.addRange(nr);
        const key=ceEl.dataset.textKey;
        if(key)dirtyText.current={id,key};
        return;
      }
    }
    setSelFont(null);
    setShapes(prev=>prev.map(s=>{
      if(s.id!==id)return s;
      let nf=((s.font||0)+dir)%FONTS.length;
      if(nf<0)nf=FONTS.length-1;
      return{...s,font:nf};
    }));
  },[shapes,selFont,updateText]);

  const delShape=useCallback((id)=>{
    flushDirtyText();
    push(shapes.filter(s=>s.id!==id));
    if(sel===id)setSel(null);
  },[shapes,push,sel,flushDirtyText]);

  const onDrop=useCallback(e=>{
    e.preventDefault();const info=dRef.current;if(!info)return;
    const pt=toCanvas(e.clientX,e.clientY);
    const ns={id:uid(),type:info.type,x:pt.x-info.w/2,y:pt.y-info.h/2,w:info.w,h:info.h,variant:prefV[info.type]||0,texts:{},font:0};
    const sn=snap(ns,shapes);if(sn.x!==null)ns.x=sn.x;if(sn.y!==null)ns.y=sn.y;
    push([...shapes,ns]);setSel(ns.id);nudge({complexity:.02});dRef.current=null;
  },[shapes,push,nudge,prefV,toCanvas]);

  const onDown=useCallback((e,s)=>{
    e.stopPropagation();flushDirtyText();setSel(s.id);setDrag(s.id);
    const pt=toCanvas(e.clientX,e.clientY);
    setOff({x:pt.x-s.x,y:pt.y-s.y});
  },[toCanvas,flushDirtyText]);

  const onMove=useCallback(e=>{
    if(pan){
      setCam(c=>({...c,x:c.x+(e.clientX-pan.x),y:c.y+(e.clientY-pan.y)}));
      setPan({x:e.clientX,y:e.clientY});
      return;
    }
    if(!drag&&!rsz)return;
    const pt=toCanvas(e.clientX,e.clientY);
    if(rsz){const s=shapes.find(x=>x.id===rsz);if(!s)return;let nw=Math.max(40,pt.x-s.x),nh=Math.max(20,pt.y-s.y);if(e.shiftKey){const ratio=s.w/s.h;if(nw/nh>ratio)nh=nw/ratio;else nw=nh*ratio;}setShapes(shapes.map(x=>x.id===rsz?{...x,w:nw,h:nh}:x));return}
    if(drag){let nx=pt.x-off.x,ny=pt.y-off.y;const s=shapes.find(x=>x.id===drag);if(!s)return;const sn=snap({...s,x:nx,y:ny},shapes);if(sn.x!==null)nx=sn.x;if(sn.y!==null)ny=sn.y;setGuides(sn.g);setShapes(shapes.map(x=>x.id===drag?{...x,x:nx,y:ny}:x))}
  },[drag,rsz,shapes,off,pan,toCanvas]);

  const onUp=useCallback(()=>{
    if(pan)setPan(null);
    if(drag){nudge({density:.01});setDrag(null);setGuides([])}
    if(rsz)setRsz(null);
  },[drag,rsz,nudge,pan]);

  const onDel=useCallback(()=>{if(!sel)return;push(shapes.filter(s=>s.id!==sel));setSel(null)},[sel,shapes,push]);

  const dupShape=useCallback(()=>{
    if(!sel)return;const s=shapes.find(x=>x.id===sel);if(!s)return;
    const ns={...s,id:uid(),x:s.x+20,y:s.y+20,texts:{...(s.texts||{})}};
    push([...shapes,ns]);setSel(ns.id);
  },[sel,shapes,push]);

  /* ---- KEYBOARD ---- */
  useEffect(()=>{const h=e=>{
    if((e.key==="Backspace"||e.key==="Delete")&&!e.target.isContentEditable){e.preventDefault();onDel()}
    if((e.metaKey||e.ctrlKey)&&e.shiftKey&&e.key==="z"){e.preventDefault();redo();return}
    if((e.metaKey||e.ctrlKey)&&e.key==="z"){e.preventDefault();undo()}
    if((e.metaKey||e.ctrlKey)&&e.key==="d"){e.preventDefault();dupShape()}
    if(sel&&!e.target.isContentEditable&&["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)){
      e.preventDefault();const d=e.shiftKey?10:1;
      const dx=e.key==="ArrowLeft"?-d:e.key==="ArrowRight"?d:0;
      const dy=e.key==="ArrowUp"?-d:e.key==="ArrowDown"?d:0;
      setShapes(prev=>prev.map(s=>s.id===sel?{...s,x:s.x+dx,y:s.y+dy}:s));
    }
  };window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h)},[onDel,undo,redo,dupShape,sel]);

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

  useEffect(()=>{if(["warm","candy"].includes(pal))nudge({warmth:.04});else if(pal==="cool"||pal==="ocean")nudge({warmth:-.04});else if(pal==="noir"||pal==="neon")nudge({boldness:.05,warmth:-.06});else if(pal==="cloud")nudge({warmth:.03,density:-.02});else if(pal==="mint"||pal==="forest")nudge({warmth:-.02,roundness:.02});else if(pal==="mocha")nudge({warmth:.05,roundness:.02});else if(pal==="lavender")nudge({complexity:.03,warmth:.01})},[pal]);

  const p=PAL[pal];
  const btnSt={background:"none",border:`1px solid ${p.bd}`,borderRadius:8,padding:"5px 12px",fontSize:11,color:p.mu,cursor:"pointer",fontFamily:"inherit"};
  const zoomPct=Math.round(cam.z*100);

  return(
    <div style={{width:"100%",height:"100vh",display:"flex",flexDirection:"column",background:p.bg,fontFamily:"'DM Sans',system-ui,sans-serif",color:p.tx,transition:"background .4s,color .4s"}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&family=Outfit:wght@400;500;600;700&family=Sora:wght@400;500;600;700&family=Work+Sans:wght@400;500;600;700&family=Figtree:wght@400;500;600;700&family=Instrument+Serif&family=Geist:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Playfair+Display:wght@400;500;600;700&family=Bricolage+Grotesque:wght@400;500;600;700&family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet"/>

      {/* HEADER */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 20px",borderBottom:`1px solid ${p.bd}`,background:p.card+"cc",backdropFilter:"blur(12px)",zIndex:50,transition:"all .4s"}}>
        <div style={{display:"flex",alignItems:"baseline",gap:8}}><span style={{fontFamily:"'Instrument Serif',Georgia,serif",fontSize:22,color:p.tx,letterSpacing:"-0.02em"}}>Tasteprint</span></div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{display:"flex",gap:4,flexWrap:"wrap",maxWidth:220}}>{Object.entries(PAL).map(([k,v])=><button key={k} onClick={()=>setPal(k)} title={v.name} style={{width:18,height:18,borderRadius:999,border:pal===k?`2px solid ${p.ac}`:"2px solid transparent",background:k==="noir"||k==="neon"?"#1A1A1E":v.ac,cursor:"pointer",transition:"all .2s",transform:pal===k?"scale(1.2)":"scale(1)"}}/>)}</div>
          <div style={{width:1,height:20,background:p.bd}}/>
          <div style={{display:"flex",alignItems:"center",border:`1px solid ${p.bd}`,borderRadius:8,overflow:"hidden"}}>
            {[{k:"free",l:"Free"},{k:"desktop",l:"Desktop"},{k:"phone",l:"Phone"}].map(d=><button key={d.k} onClick={()=>setDevice(d.k)} style={{background:device===d.k?p.su:"none",border:"none",padding:"5px 10px",fontSize:10,color:device===d.k?p.tx:p.mu,cursor:"pointer",fontFamily:"inherit",fontWeight:device===d.k?500:400}}>{d.l}</button>)}
          </div>
          <div style={{width:1,height:20,background:p.bd}}/>
          <button onClick={clearAll} title="New canvas" style={btnSt}>New</button>
          <button onClick={exportPng} title="Export as PNG" style={btnSt}>PNG</button>
          <button onClick={exportJSON} title="Export JSON" style={btnSt}>Export</button>
          <button onClick={importJSON} title="Import JSON" style={btnSt}>Import</button>
          <button onClick={undo} title="Undo (⌘Z)" style={btnSt}>Undo</button>
          <button onClick={redo} title="Redo (⌘⇧Z)" style={btnSt}>Redo</button>
        </div>
      </div>

      <div style={{display:"flex",flex:1,overflow:"hidden"}}>
        {/* LIBRARY */}
        <div style={{display:"flex",flexShrink:0,borderRight:`1px solid ${p.bd}`,background:p.card+"88",backdropFilter:"blur(8px)",transition:"all .4s"}}>
          {/* category list */}
          <div style={{width:100,padding:"10px 0",overflowY:"auto",borderRight:`1px solid ${p.bd}`,display:"flex",flexDirection:"column",gap:1}}>
            {LIB.map(cat=>(
              <div key={cat.cat} onClick={()=>setExpCat(cat.cat)}
                style={{padding:"10px 12px",fontSize:11,fontWeight:expCat===cat.cat?600:400,color:expCat===cat.cat?p.tx:p.mu,cursor:"pointer",userSelect:"none",background:expCat===cat.cat?p.su:"transparent",borderRight:expCat===cat.cat?`2px solid ${p.ac}`:"2px solid transparent",transition:"all .15s"}}>
                {cat.cat}
              </div>
            ))}
          </div>
          {/* component cards */}
          <div style={{width:280,padding:10,overflowY:"auto",display:"flex",flexDirection:"column",gap:6}}>
            {(LIB.find(c=>c.cat===expCat)?.items||[]).map(item=>{
              const pv=prefV[item.type]||0;const vn=varName(item.type,pv);
              const tw=240,ts=Math.min(tw/item.w,1),th=item.h*ts;
              return(
                <div key={item.type} draggable onDragStart={()=>{dRef.current=item}}
                  style={{padding:10,borderRadius:10,cursor:"grab",display:"flex",flexDirection:"column",gap:6,transition:"background .12s",border:`1px solid ${p.bd}`}}
                  onMouseEnter={e=>e.currentTarget.style.background=p.su} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontSize:12,fontWeight:500,color:p.tx}}>{item.label}</span>
                    <span style={{fontSize:10,color:p.mu,opacity:.6}}>{vn}</span>
                  </div>
                  <div style={{width:tw,height:th,borderRadius:6,overflow:"hidden",pointerEvents:"none",alignSelf:"center"}}>
                    <div style={{transform:`scale(${ts})`,transformOrigin:"top left",width:item.w,height:item.h}}><C type={item.type} v={pv} p={p}/></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* CANVAS */}
        <div style={{flex:1,display:"flex",alignItems:device==="free"?"stretch":"center",justifyContent:"center",overflow:"hidden",background:device!=="free"?p.su:"transparent"}} onDragOver={e=>e.preventDefault()} onDrop={onDrop}>
        <div ref={cRef} onDrop={onDrop} onDragOver={e=>e.preventDefault()} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
          onMouseDown={e=>{
            if(e.button===1){e.preventDefault();setPan({x:e.clientX,y:e.clientY})}
            if(e.button===0&&(e.target===cRef.current||e.target.closest("[data-c]"))){flushDirtyText();setSel(null);setSelFont(null)}
          }}
          onContextMenu={e=>e.preventDefault()}
          style={{...(device==="free"?{flex:1}:device==="desktop"?{width:1280,maxWidth:"100%"}:{width:390}),height:device==="phone"?844:undefined,position:"relative",overflow:"hidden",cursor:pan?"grabbing":"default",borderRadius:device!=="free"?16:0,border:device!=="free"?`1px solid ${p.bd}`:"none",boxShadow:device!=="free"?`0 4px 24px ${p.tx}08`:"none",background:device!=="free"?p.bg:"transparent"}}>

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
              const isSel=sel===s.id,isDrg=drag===s.id;
              const mx=maxV(s.type);
              const vn=varName(s.type,s.variant||0);
              const fontIdx=selFont!==null?selFont:(s.font||0);
              const fn=FONTS[fontIdx]?.name||FONTS[0].name;
              const ff=FONTS[fontIdx]?.family||FONTS[0].family;
              return(
                <div key={s.id} style={{position:"absolute",left:s.x,top:s.y,width:s.w,zIndex:isDrg?100:isSel?50:1}}>
                  {/* toolbar: variant + font pickers — only on select */}
                  {isSel&&!isDrg&&(mx>1||HAS_TEXT.has(s.type))&&(
                    <div style={{position:"absolute",top:-36,left:"50%",transform:"translateX(-50%)",display:"flex",alignItems:"center",gap:1,zIndex:200,background:p.card,border:`1px solid ${p.bd}`,borderRadius:999,padding:"2px 3px",boxShadow:`0 4px 16px ${p.tx}10`,whiteSpace:"nowrap",userSelect:"none"}}>
                      {mx>1&&<>
                        <button onPointerDown={e=>{e.stopPropagation();e.preventDefault();cycle(s.id,-1)}} style={{width:26,height:26,borderRadius:999,border:"none",background:p.su,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:p.tx,fontSize:15,fontFamily:"system-ui",padding:0}}>{"‹"}</button>
                        <span style={{fontSize:9,color:p.mu,padding:"0 4px",width:68,textAlign:"center",overflow:"hidden",textOverflow:"ellipsis"}}>{vn}</span>
                        <button onPointerDown={e=>{e.stopPropagation();e.preventDefault();cycle(s.id,1)}} style={{width:26,height:26,borderRadius:999,border:"none",background:p.su,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:p.tx,fontSize:15,fontFamily:"system-ui",padding:0}}>{"›"}</button>
                        {HAS_TEXT.has(s.type)&&<div style={{width:1,height:16,background:p.bd,margin:"0 2px"}}/>}
                      </>}
                      {HAS_TEXT.has(s.type)&&<>
                        <button onPointerDown={e=>{e.stopPropagation();e.preventDefault();cycleFont(s.id,-1)}} style={{width:26,height:26,borderRadius:999,border:"none",background:p.su,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:p.tx,fontSize:15,fontFamily:"system-ui",padding:0}}>{"‹"}</button>
                        <span style={{fontSize:9,color:p.ac,padding:"0 4px",width:100,textAlign:"center",fontFamily:ff,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis"}}>{fn}</span>
                        <button onPointerDown={e=>{e.stopPropagation();e.preventDefault();cycleFont(s.id,1)}} style={{width:26,height:26,borderRadius:999,border:"none",background:p.su,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",color:p.tx,fontSize:15,fontFamily:"system-ui",padding:0}}>{"›"}</button>
                      </>}
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
                  <div onMouseDown={e=>onDown(e,s)}
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
      </div>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(128,128,128,.12);border-radius:2px}`}</style>
    </div>
  );
}
