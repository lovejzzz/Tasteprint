import React from "react";

export default function CodeTypewriter({b,fsize=1}){
  const mono="'JetBrains Mono',monospace";const cfs=n=>Math.round(n*fsize);
  const full="import { useState } from 'react';\n\nfunction Counter() {\n  const [n, set] = useState(0);\n  return (\n    <button onClick={() => set(n+1)}>\n      Clicked {n} times\n    </button>\n  );\n}";
  const [pos,setPos]=React.useState(0);
  React.useEffect(()=>{
    if(pos<full.length){const t=setTimeout(()=>setPos(p=>p+1),full[pos]==='\n'?200:35+Math.random()*25);return()=>clearTimeout(t);}
  },[pos,full]);
  const visible=full.slice(0,pos);
  const vLines=visible.split('\n');
  const done=pos>=full.length;
  const hi=(s)=>s.startsWith('import')||s.startsWith('function')?'#cba6f7':s.includes("'")?'#a6e3a1':s.includes('//')?'#585b70':s.trim().startsWith('<')?'#89b4fa':s.includes('const')?'#89b4fa':'#cdd6f4';
  return <div style={{...b,background:'#1e1e2e',borderRadius:12,padding:14,fontFamily:mono,overflow:'hidden',display:'flex',flexDirection:'column'}}>
    <div style={{display:'flex',gap:6,marginBottom:10}}>
      {['#ff5f56','#ffbd2e','#27c93f'].map((c,i)=><div key={i} style={{width:8,height:8,borderRadius:99,background:c,opacity:.7}}/>)}
      <span style={{marginLeft:'auto',fontSize:8,color:'#555'}}>{done?'✓ done':'typing...'}</span>
    </div>
    <div style={{flex:1,overflow:'hidden'}}>
      {vLines.map((l,i)=><div key={i} style={{display:'flex',gap:12,height:Math.round(16*fsize)}}>
        <span style={{fontSize:cfs(10),color:'#555',width:16,textAlign:'right',userSelect:'none'}}>{i+1}</span>
        <span style={{fontSize:cfs(10),color:hi(l),lineHeight:1.7,whiteSpace:'pre'}}>{l}{i===vLines.length-1&&!done?'▌':''}</span>
      </div>)}
    </div>
    {done&&<div style={{marginTop:8,padding:'4px 8px',background:'#27c93f15',borderRadius:6,display:'flex',alignItems:'center',gap:6,animation:'tp-slidein .3s ease-out'}}>
      <span style={{fontSize:8,color:'#27c93f'}}>●</span>
      <span style={{fontSize:9,color:'#27c93f',opacity:.7}}>Ready — {full.split('\n').length} lines</span>
      <span onClick={()=>setPos(0)} style={{marginLeft:'auto',fontSize:8,color:'#555',cursor:'pointer',userSelect:'none'}} onMouseDown={e=>e.stopPropagation()}>↻ replay</span>
    </div>}
  </div>;
}
