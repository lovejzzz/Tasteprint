import React from "react";
import { getTextureStyle } from "../../utils";

export default function CodeTypewriter({b,fsize=1,texture,p}){
  const mono="'JetBrains Mono',monospace";const cfs=n=>Math.round(n*fsize);
  const full="import { useState } from 'react';\n\nfunction Counter() {\n  const [n, set] = useState(0);\n  return (\n    <button onClick={() => set(n+1)}>\n      Clicked {n} times\n    </button>\n  );\n}";
  const [pos,setPos]=React.useState(0);
  const [replayHover,setReplayHover]=React.useState(false);
  const [dotHovers,setDotHovers]=React.useState([false,false,false]);
  React.useEffect(()=>{
    if(pos<full.length){const t=setTimeout(()=>setPos(pp=>pp+1),full[pos]==='\n'?200:35+Math.random()*25);return()=>clearTimeout(t);}
  },[pos,full]);
  const visible=full.slice(0,pos);
  const vLines=visible.split('\n');
  const done=pos>=full.length;
  const hi=(s)=>s.startsWith('import')||s.startsWith('function')?'#cba6f7':s.includes("'")?'#a6e3a1':s.includes('//')?'#585b70':s.trim().startsWith('<')?'#89b4fa':s.includes('const')?'#89b4fa':'#cdd6f4';
  const texStyle=getTextureStyle(texture,p);
  return <div style={{...b,...texStyle,background:'#1e1e2e',borderRadius:12,padding:14,fontFamily:mono,overflow:'hidden',display:'flex',flexDirection:'column',scrollbarWidth:'thin',transition:'box-shadow 0.3s ease, transform 0.3s ease'}}>
    <div style={{display:'flex',gap:6,marginBottom:10,alignItems:'center'}}>
      {['#ff5f56','#ffbd2e','#27c93f'].map((c,i)=><div
        key={i}
        onMouseEnter={()=>setDotHovers(h=>{const n=[...h];n[i]=true;return n;})}
        onMouseLeave={()=>setDotHovers(h=>{const n=[...h];n[i]=false;return n;})}
        style={{width:8,height:8,borderRadius:99,background:c,opacity:dotHovers[i]?1:.7,transform:dotHovers[i]?'scale(1.35)':'scale(1)',transition:'opacity 0.2s ease, transform 0.2s ease',cursor:'pointer'}}
      />)}
      <span style={{marginLeft:'auto',fontSize:8,color:'#555',transition:'color 0.3s ease'}}>{done?'✓ done':'typing...'}</span>
    </div>
    <div style={{flex:1,overflow:'auto',scrollbarWidth:'thin',transition:'opacity 0.3s ease'}}>
      {vLines.map((l,i)=><div key={i} style={{display:'flex',gap:12,height:Math.round(16*fsize),transition:'opacity 0.15s ease'}}>
        <span style={{fontSize:cfs(10),color:'#555',width:16,textAlign:'right',userSelect:'none'}}>{i+1}</span>
        <span style={{fontSize:cfs(10),color:hi(l),lineHeight:1.7,whiteSpace:'pre'}}>{l}{i===vLines.length-1&&!done?'▌':''}</span>
      </div>)}
    </div>
    {done&&<div style={{marginTop:8,padding:'4px 8px',background:'rgba(39,201,63,0.08)',backdropFilter:'blur(8px)',WebkitBackdropFilter:'blur(8px)',borderRadius:6,display:'flex',alignItems:'center',gap:6,animation:'tp-slidein .3s ease-out',transition:'background 0.3s ease'}}>
      <span style={{fontSize:8,color:'#27c93f'}}>●</span>
      <span style={{fontSize:9,color:'#27c93f',opacity:.7}}>Ready — {full.split('\n').length} lines</span>
      <span
        onClick={()=>setPos(0)}
        onMouseEnter={()=>setReplayHover(true)}
        onMouseLeave={()=>setReplayHover(false)}
        style={{marginLeft:'auto',fontSize:8,color:replayHover?'#cdd6f4':'#555',cursor:'pointer',userSelect:'none',transform:replayHover?'scale(1.15)':'scale(1)',background:replayHover?'rgba(205,214,244,0.1)':'transparent',padding:'2px 6px',borderRadius:4,transition:'color 0.2s ease, transform 0.2s ease, background 0.2s ease'}}
        onMouseDown={e=>e.stopPropagation()}
      >↻ replay</span>
    </div>}
  </div>;
}
