import React from "react";
import { tokenize, TC, HighlightLine } from "./tokenizer";

export default function CodeMinimap({b,fsize=1}){
  const mono="'JetBrains Mono',monospace";const cfs=n=>Math.round(n*fsize);
  const code="import express from 'express';\nimport cors from 'cors';\nimport { db } from './database';\n\nconst app = express();\napp.use(cors());\napp.use(express.json());\n\n// Routes\napp.get('/api/users', async (req, res) => {\n  const users = await db.query('SELECT * FROM users');\n  res.json({ data: users, count: users.length });\n});\n\napp.post('/api/users', async (req, res) => {\n  const { name, email } = req.body;\n  const user = await db.insert('users', { name, email });\n  res.status(201).json(user);\n});\n\napp.delete('/api/users/:id', async (req, res) => {\n  await db.delete('users', req.params.id);\n  res.status(204).end();\n});\n\n// Error handler\napp.use((err, req, res, next) => {\n  console.error(err.stack);\n  res.status(500).json({ error: 'Internal server error' });\n});\n\napp.listen(3000, () => {\n  console.log('Server running on :3000');\n});";
  const lines=code.split('\n');
  const [scroll,setScroll]=React.useState(0);
  const visible=12;const mmScale=0.18;
  return <div style={{...b,background:'#1e1e2e',borderRadius:12,display:'flex',flexDirection:'column',overflow:'hidden',fontFamily:mono}}>
    <div style={{display:'flex',alignItems:'center',padding:'5px 12px',borderBottom:'1px solid #ffffff10',gap:6}}>
      <span style={{fontSize:9,color:'#555'}}>src ›</span>
      <span style={{fontSize:10,color:'#cdd6f4',fontWeight:500}}>server.js</span>
      <span style={{fontSize:8,color:'#555',marginLeft:'auto'}}>{lines.length} lines</span>
    </div>
    <div style={{flex:1,display:'flex',minHeight:0}}>
      <div style={{flex:1,overflow:'auto',display:'flex',minWidth:0}} onScroll={e=>{setScroll(Math.round(e.target.scrollTop/16))}}>
        <div style={{padding:'4px 0',width:28,textAlign:'right',userSelect:'none',borderRight:'1px solid #ffffff08',background:'#16162a',flexShrink:0}}>
          {lines.map((_,i)=><div key={i} style={{fontSize:cfs(9),lineHeight:Math.round(16*fsize)+'px',color:i===9?'#f9e2af':'#444',paddingRight:6}}>{i+1}</div>)}
        </div>
        <div style={{padding:'4px 8px',minWidth:0}}>
          {lines.map((l,i)=><div key={i} style={{fontSize:cfs(10),lineHeight:Math.round(16*fsize)+'px',whiteSpace:'pre',background:i===9?'#f9e2af08':'transparent'}}><HighlightLine text={l}/></div>)}
        </div>
      </div>
      <div style={{width:44,background:'#16162a',borderLeft:'1px solid #ffffff08',position:'relative',flexShrink:0,overflow:'hidden'}}>
        <div style={{position:'absolute',top:scroll*16*mmScale,left:0,right:0,height:visible*16*mmScale,background:'#cba6f720',borderRadius:1}}/>
        {lines.map((l,i)=><div key={i} style={{height:16*mmScale,padding:'0 3px',overflow:'hidden'}}>
          <div style={{height:'100%',display:'flex',gap:1}}>
            {tokenize(l).filter(t=>t.v.trim()).slice(0,8).map((t,j)=><div key={j} style={{width:Math.min(t.v.length*1.5,8),height:1.5,background:TC[t.c]||'#555',opacity:.5,borderRadius:.5,alignSelf:'center'}}/>)}
          </div>
        </div>)}
      </div>
    </div>
    <div style={{display:'flex',alignItems:'center',padding:'3px 10px',borderTop:'1px solid #ffffff08',gap:6}}>
      <span style={{fontSize:8,color:'#27c93f'}}>●</span>
      <span style={{fontSize:8,color:'#555'}}>Ln 10, Col 1</span>
      <span style={{fontSize:8,color:'#555',marginLeft:'auto'}}>JavaScript</span>
    </div>
  </div>;
}
