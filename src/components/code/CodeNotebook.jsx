import React from "react";


const scrollbarCSS = `
.codenotebook-scroll::-webkit-scrollbar { width: 4px; height: 4px; }
.codenotebook-scroll::-webkit-scrollbar-track { background: transparent; }
.codenotebook-scroll::-webkit-scrollbar-thumb { background: #ffffff18; border-radius: 4px; }
.codenotebook-scroll::-webkit-scrollbar-thumb:hover { background: #ffffff30; }
`;

export default function CodeNotebook({b,fsize=1}){
  const mono="'JetBrains Mono',monospace";const cfs=n=>Math.round(n*fsize);
  const [cells,setCells]=React.useState([
    {code:'const greet = name => `Hello, ${name}!`;\ngreet("World");',out:null},
    {code:'// Math operations\nconst nums = [1,2,3,4,5];\nnums.reduce((a,b) => a+b, 0);',out:null},
    {code:'// Try editing me!\nArray.from({length:5}, (_,i) => ({\n  id: i+1,\n  value: Math.round(Math.random()*100)\n}));',out:null},
  ]);
  const [hovRun,setHovRun]=React.useState(null);
  const [hovDel,setHovDel]=React.useState(null);
  const [hovRunAll,setHovRunAll]=React.useState(false);
  const [hovAdd,setHovAdd]=React.useState(false);
  const [hovCell,setHovCell]=React.useState(null);
  const stop=e=>e.stopPropagation();
  const runCell=(idx)=>{
    const c=cells[idx];const logs=[];
    const fc={log:(...a)=>logs.push(a.map(x=>typeof x==='object'?JSON.stringify(x,null,2):String(x)).join(' ')),error:(...a)=>logs.push('✗ '+a.join(' ')),warn:(...a)=>logs.push('⚠ '+a.join(' ')),info:(...a)=>logs.push(a.join(' ')),clear:()=>{logs.length=0},table:(...a)=>logs.push(a.map(x=>JSON.stringify(x,null,2)).join(' '))};
    try{const r=new Function('console',c.code)(fc);if(r!==undefined)logs.push('← '+JSON.stringify(r,null,2));setCells(prev=>prev.map((cl,i)=>i===idx?{...cl,out:{logs,err:null}}:cl));}
    catch(e){setCells(prev=>prev.map((cl,i)=>i===idx?{...cl,out:{logs,err:e.message}}:cl));}
  };
  const addCell=()=>setCells(prev=>[...prev,{code:'// New cell\n',out:null}]);
  const delCell=(idx)=>{if(cells.length<=1)return;setCells(prev=>prev.filter((_,i)=>i!==idx));};
  const updateCell=(idx,code)=>setCells(prev=>prev.map((c,i)=>i===idx?{...c,code}:c));

  return <>
    <style>{scrollbarCSS}</style>
    <div style={{...b,background:'#1e1e2e',borderRadius:12,display:'flex',flexDirection:'column',overflow:'hidden',fontFamily:mono}}>
    <div style={{display:'flex',alignItems:'center',padding:'6px 12px',borderBottom:'1px solid #ffffff10',gap:6,backdropFilter:'blur(8px)',WebkitBackdropFilter:'blur(8px)',background:'#1e1e2e99'}}>
      <span style={{fontSize:9,color:'#cba6f7',fontWeight:600}}>⬡</span>
      <span style={{fontSize:10,color:'#cdd6f4',fontWeight:500}}>Notebook</span>
      <span style={{fontSize:8,color:'#555',marginLeft:'auto',transition:'color 0.2s ease'}}>{cells.length} cells</span>
      <button
        onClick={()=>{cells.forEach((_,i)=>runCell(i))}}
        onMouseDown={stop}
        onMouseEnter={()=>setHovRunAll(true)}
        onMouseLeave={()=>setHovRunAll(false)}
        style={{
          background:hovRunAll?'#27c93f33':'#27c93f22',
          color:'#27c93f',
          border:'none',borderRadius:4,padding:'2px 8px',fontSize:8,cursor:'pointer',fontFamily:mono,
          transform:hovRunAll?'scale(1.08)':'scale(1)',
          transition:'all 0.2s ease',
        }}>▶ All</button>
    </div>
    <div className="codenotebook-scroll" style={{flex:1,overflow:'auto',padding:8,display:'flex',flexDirection:'column',gap:6}}>
      {cells.map((c,idx)=><div key={idx}
        onMouseEnter={()=>setHovCell(idx)}
        onMouseLeave={()=>setHovCell(null)}
        style={{
          border:'1px solid',
          borderColor:hovCell===idx?'#ffffff20':'#ffffff10',
          borderRadius:8,overflow:'hidden',
          borderLeft:c.out?c.out.err?'2px solid #f38ba8':'2px solid #27c93f':'2px solid #555',
          transition:'border-color 0.2s ease, box-shadow 0.25s ease',
          boxShadow:hovCell===idx?'0 2px 12px #00000030':'none',
        }}>
        <div style={{display:'flex',alignItems:'center',padding:'3px 8px',background:'#16162a',gap:4,backdropFilter:'blur(6px)',WebkitBackdropFilter:'blur(6px)'}}>
          <span style={{fontSize:8,color:'#cba6f7',fontWeight:600}}>In [{idx+1}]</span>
          <button
            onClick={()=>runCell(idx)}
            onMouseDown={stop}
            onMouseEnter={()=>setHovRun(idx)}
            onMouseLeave={()=>setHovRun(null)}
            style={{
              marginLeft:'auto',background:hovRun===idx?'#27c93f18':'transparent',
              color:'#27c93f',border:'none',fontSize:9,cursor:'pointer',fontFamily:mono,padding:'1px 5px',borderRadius:3,
              transform:hovRun===idx?'scale(1.15)':'scale(1)',
              transition:'all 0.18s ease',
            }}>▶</button>
          {cells.length>1&&<button
            onClick={()=>delCell(idx)}
            onMouseDown={stop}
            onMouseEnter={()=>setHovDel(idx)}
            onMouseLeave={()=>setHovDel(null)}
            style={{
              background:hovDel===idx?'#f38ba818':'transparent',
              color:hovDel===idx?'#f38ba8':'#555',
              border:'none',fontSize:9,cursor:'pointer',fontFamily:mono,padding:'1px 4px',borderRadius:3,
              transform:hovDel===idx?'scale(1.15)':'scale(1)',
              transition:'all 0.18s ease',
            }}>✕</button>}
        </div>
        <textarea value={c.code} onChange={e=>updateCell(idx,e.target.value)} onMouseDown={stop} onKeyDown={e=>{e.stopPropagation();if(e.key==='Enter'&&(e.metaKey||e.ctrlKey)){e.preventDefault();runCell(idx);}if(e.key==='Tab'){e.preventDefault();const s=e.target.selectionStart;updateCell(idx,c.code.substring(0,s)+'  '+c.code.substring(e.target.selectionEnd));setTimeout(()=>{e.target.selectionStart=e.target.selectionEnd=s+2},0);}}}
          spellCheck={false} className="codenotebook-scroll" style={{width:'100%',background:'#1a1a2e',color:'#cdd6f4',border:'none',outline:'none',resize:'none',padding:'6px 10px',fontSize:cfs(9),lineHeight:Math.round(15*fsize)+'px',fontFamily:mono,whiteSpace:'pre',minHeight:36,transition:'background 0.2s ease'}}/>
        {c.out&&<div style={{padding:'4px 10px',background:'#12122a',borderTop:'1px solid #ffffff06',transition:'all 0.25s ease',animation:'fadeIn 0.2s ease'}}>
          <span style={{fontSize:8,color:'#555'}}>Out [{idx+1}]:</span>
          {c.out.logs.map((l,i)=><div key={i} style={{fontSize:cfs(9),lineHeight:Math.round(14*fsize)+'px',color:l.startsWith('✗')?'#f38ba8':l.startsWith('←')?'#89b4fa':'#a6adc8',whiteSpace:'pre-wrap'}}>{l}</div>)}
          {c.out.err&&<div style={{fontSize:cfs(9),color:'#f38ba8'}}>Error: {c.out.err}</div>}
        </div>}
      </div>)}
      <button
        onClick={addCell}
        onMouseDown={stop}
        onMouseEnter={()=>setHovAdd(true)}
        onMouseLeave={()=>setHovAdd(false)}
        style={{
          alignSelf:'center',
          background:hovAdd?'#ffffff14':'#ffffff08',
          color:hovAdd?'#888':'#555',
          border:'1px dashed',
          borderColor:hovAdd?'#ffffff25':'#ffffff15',
          borderRadius:6,padding:'4px 16px',fontSize:9,cursor:'pointer',fontFamily:mono,
          transform:hovAdd?'scale(1.05)':'scale(1)',
          transition:'all 0.2s ease',
        }}>+ Add Cell</button>
    </div>
  </div>
  </>;
}
