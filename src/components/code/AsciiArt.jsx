import React from "react";

export default function AsciiArt({b,fsize=1}){
  const mono="'JetBrains Mono',monospace";const cfs=n=>Math.round(n*fsize);
  const [text,setText]=React.useState('CODE');
  const stop=e=>e.stopPropagation();
  const CHARS={A:['  ▄▄  ','▐▌ ▐▌','▐▀▀▀▌','▐▌ ▐▌'],B:['▐▀▀▄ ','▐▀▀▄ ','▐▄▄▀ ','     '],C:['▄▀▀▀ ','▐▌   ','▀▀▀▀ ','     '],D:['▐▀▀▄ ','▐▌ ▐▌','▐▄▄▀ ','     '],E:['▐▀▀▀ ','▐▀▀  ','▐▄▄▄ ','     '],F:['▐▀▀▀ ','▐▀▀  ','▐▌   ','     '],G:['▄▀▀▀ ','▐▌ ▀▄','▀▀▀▀ ','     '],H:['▐▌ ▐▌','▐▀▀▀▌','▐▌ ▐▌','     '],I:['▐▀▀▌','  █ ','▐▄▄▌','    '],J:['  ▐▌','  ▐▌','▀▀▀ ','    '],K:['▐▌▄▀ ','▐▀▄  ','▐▌ ▀▄','     '],L:['▐▌   ','▐▌   ','▐▄▄▄ ','     '],M:['▐▀▄▀▌','▐▌▀▐▌','▐▌ ▐▌','     '],N:['▐▀▄ ▌','▐▌▀▄▌','▐▌ ▀▌','     '],O:['▄▀▀▄ ','▐▌ ▐▌','▀▄▄▀ ','     '],P:['▐▀▀▄ ','▐▀▀  ','▐▌   ','     '],Q:['▄▀▀▄ ','▐▌ ▐▌','▀▄▄▀▄','     '],R:['▐▀▀▄ ','▐▀▀▄ ','▐▌ ▐▌','     '],S:['▄▀▀▀ ',' ▀▀▄ ','▄▄▄▀ ','     '],T:['▀▀█▀▀','  █  ','  █  ','     '],U:['▐▌ ▐▌','▐▌ ▐▌','▀▄▄▀ ','     '],V:['▐▌ ▐▌','▐▌ ▐▌',' ▀▀  ','     '],W:['▐▌ ▐▌','▐▌▄▐▌','▐▀ ▀▌','     '],X:['▐▌ ▐▌',' ▀▄▀ ','▐▌ ▐▌','     '],Y:['▐▌ ▐▌',' ▀▄▀ ','  █  ','     '],Z:['▀▀▀▐▌',' ▄▀  ','▐▌▄▄▄','     '],' ':['   ','   ','   ','   '],'!':['█','█','▄','  ']};
  const render=()=>{
    const upper=text.toUpperCase();const rows=['','','',''];
    for(const ch of upper){const g=CHARS[ch]||CHARS[' '];for(let r=0;r<4;r++)rows[r]+=(g[r]||'');}
    return rows;
  };
  const art=render();
  return <div style={{...b,background:'#0c0c0e',borderRadius:10,display:'flex',flexDirection:'column',overflow:'hidden',fontFamily:mono,border:'1px solid #27c93f20'}}>
    <div style={{display:'flex',alignItems:'center',padding:'6px 12px',borderBottom:'1px solid #ffffff10',gap:6}}>
      <span style={{fontSize:8,color:'#27c93f',letterSpacing:'.06em'}}>ASCII ART GENERATOR</span>
      <span style={{marginLeft:'auto',fontSize:8,color:'#555'}}>{text.length} chars</span>
    </div>
    <div style={{padding:'8px 12px',borderBottom:'1px solid #ffffff08',display:'flex',alignItems:'center',gap:8}}>
      <span style={{fontSize:8,color:'#555'}}>$</span>
      <input value={text} onChange={e=>setText(e.target.value.slice(0,12))} onMouseDown={stop} onKeyDown={e=>e.stopPropagation()} maxLength={12} placeholder="Type here..."
        style={{flex:1,background:'transparent',border:'none',outline:'none',color:'#cdd6f4',fontSize:11,fontFamily:mono,padding:0}}/>
    </div>
    <div style={{flex:1,overflow:'auto',padding:'12px 16px',display:'flex',flexDirection:'column',justifyContent:'center'}}>
      {art.map((row,i)=><div key={i} style={{fontSize:cfs(8),lineHeight:Math.round(10*fsize)+'px',color:'#27c93f',whiteSpace:'pre',letterSpacing:1}}>{row}</div>)}
    </div>
    <div style={{padding:'4px 12px',borderTop:'1px solid #ffffff08',display:'flex',alignItems:'center',gap:6}}>
      <span style={{fontSize:8,color:'#27c93f',opacity:.3}}>●</span>
      <span style={{fontSize:8,color:'#555'}}>Block letters · {art[0].length}×4</span>
    </div>
  </div>;
}
