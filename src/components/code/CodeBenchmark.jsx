import React from "react";
import { HighlightLine } from "./tokenizer";

export default function CodeBenchmark({b,fsize=1}){
  const mono="'JetBrains Mono',monospace";const cfs=n=>Math.round(n*fsize);
  const [running,setRunning]=React.useState(false);
  const [results,setResults]=React.useState(null);
  const snippets=[
    {name:'for loop',code:'let s=0; for(let i=0;i<1e6;i++) s+=i;'},
    {name:'reduce',code:'Array.from({length:1e6},(_,i)=>i).reduce((a,b)=>a+b,0);'},
  ];
  const stop=e=>e.stopPropagation();
  const race=()=>{
    setRunning(true);setResults(null);
    setTimeout(()=>{
      const times=snippets.map(s=>{const t0=performance.now();try{new Function(s.code)()}catch(e){}return+(performance.now()-t0).toFixed(2);});
      const max=Math.max(...times);
      setResults(times.map((t,i)=>({ms:t,pct:max>0?t/max*100:50,winner:t===Math.min(...times)})));
      setRunning(false);
    },100);
  };
  return <div style={{...b,background:'#1e1e2e',borderRadius:12,display:'flex',flexDirection:'column',overflow:'hidden',fontFamily:mono}}>
    <div style={{display:'flex',alignItems:'center',padding:'6px 12px',borderBottom:'1px solid #ffffff10',gap:6}}>
      <span style={{fontSize:9,color:'#f9e2af',fontWeight:600}}>⚡</span>
      <span style={{fontSize:10,color:'#cdd6f4',fontWeight:500}}>Benchmark</span>
      <button onClick={race} disabled={running} onMouseDown={stop} style={{marginLeft:'auto',background:running?'#f9e2af':'#f9e2af22',color:running?'#000':'#f9e2af',border:'none',borderRadius:6,padding:'2px 10px',fontSize:9,fontWeight:600,cursor:running?'default':'pointer',fontFamily:mono,transition:'all .2s'}}>
        {running?'Racing...':'🏁 Race'}
      </button>
    </div>
    <div style={{flex:1,overflow:'auto',padding:10,display:'flex',flexDirection:'column',gap:10}}>
      {snippets.map((s,i)=><div key={i} style={{border:'1px solid #ffffff10',borderRadius:8,overflow:'hidden'}}>
        <div style={{padding:'4px 10px',background:'#16162a',display:'flex',alignItems:'center',gap:6}}>
          <span style={{fontSize:9,color:i===0?'#89b4fa':'#cba6f7',fontWeight:600}}>#{i+1}</span>
          <span style={{fontSize:9,color:'#888'}}>{s.name}</span>
          {results&&results[i].winner&&<span style={{marginLeft:'auto',fontSize:8,color:'#27c93f',fontWeight:600}}>🏆 WINNER</span>}
          {results&&!results[i].winner&&<span style={{marginLeft:'auto',fontSize:8,color:'#f38ba8',opacity:.6}}>slower</span>}
        </div>
        <div style={{padding:'6px 10px',fontSize:cfs(9),color:'#a6adc8',whiteSpace:'pre',lineHeight:1.6}}><HighlightLine text={s.code}/></div>
        {results&&<div style={{padding:'4px 10px 8px',display:'flex',alignItems:'center',gap:8}}>
          <div style={{flex:1,height:6,background:'#ffffff08',borderRadius:3,overflow:'hidden'}}>
            <div style={{width:`${results[i].pct}%`,height:'100%',background:results[i].winner?'#27c93f':'#f38ba8',borderRadius:3,transition:'width .8s cubic-bezier(0.22,1,0.36,1)'}}/>
          </div>
          <span style={{fontSize:9,color:results[i].winner?'#27c93f':'#f38ba8',fontWeight:600,minWidth:40,textAlign:'right'}}>{results[i].ms}ms</span>
        </div>}
      </div>)}
    </div>
    {results&&<div style={{padding:'4px 12px',borderTop:'1px solid #ffffff08',display:'flex',alignItems:'center',gap:6}}>
      <span style={{fontSize:8,color:'#27c93f'}}>●</span>
      <span style={{fontSize:8,color:'#555'}}>Winner: {snippets[results.findIndex(r=>r.winner)]?.name} ({Math.min(...results.map(r=>r.ms))}ms)</span>
      <span style={{fontSize:8,color:'#555',marginLeft:'auto'}}>{(Math.max(...results.map(r=>r.ms))/Math.min(...results.map(r=>r.ms))).toFixed(1)}x diff</span>
    </div>}
  </div>;
}
