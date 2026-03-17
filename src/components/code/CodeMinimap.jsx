import React from "react";
import { tokenize, TC, HighlightLine } from "./tokenizer";
import { getTextureStyle } from "../../utils";

export default function CodeMinimap({b,fsize=1,texture}){
  const mono="'JetBrains Mono',monospace";const cfs=n=>Math.round(n*fsize);
  const code="import express from 'express';\nimport cors from 'cors';\nimport { db } from './database';\n\nconst app = express();\napp.use(cors());\napp.use(express.json());\n\n// Routes\napp.get('/api/users', async (req, res) => {\n  const users = await db.query('SELECT * FROM users');\n  res.json({ data: users, count: users.length });\n});\n\napp.post('/api/users', async (req, res) => {\n  const { name, email } = req.body;\n  const user = await db.insert('users', { name, email });\n  res.status(201).json(user);\n});\n\napp.delete('/api/users/:id', async (req, res) => {\n  await db.delete('users', req.params.id);\n  res.status(204).end();\n});\n\n// Error handler\napp.use((err, req, res, next) => {\n  console.error(err.stack);\n  res.status(500).json({ error: 'Internal server error' });\n});\n\napp.listen(3000, () => {\n  console.log('Server running on :3000');\n});";
  const lines=code.split('\n');
  const [scroll,setScroll]=React.useState(0);
  const [hoveredBtn,setHoveredBtn]=React.useState(null);
  const visible=12;const mmScale=0.18;
  const p = 0.5;
  const trans = 'all 0.2s ease';
  return <div style={{...b,background:'#1e1e2e',borderRadius:12,display:'flex',flexDirection:'column',overflow:'hidden',fontFamily:mono,transition:trans,...getTextureStyle(texture, p)}}>
    {/* Header bar */}
    <div style={{display:'flex',alignItems:'center',padding:'5px 12px',borderBottom:'1px solid #ffffff10',gap:6,backdropFilter:'blur(8px)',WebkitBackdropFilter:'blur(8px)',transition:trans}}>
      <span style={{fontSize:9,color:'#555',transition:trans}}>src ›</span>
      <span style={{fontSize:10,color:'#cdd6f4',fontWeight:500,transition:trans}}>server.js</span>
      <span style={{fontSize:8,color:'#555',marginLeft:'auto',transition:trans}}>{lines.length} lines</span>
    </div>
    {/* Main content area */}
    <div style={{flex:1,display:'flex',minHeight:0,transition:trans}}>
      {/* Code area with thin scrollbar */}
      <div style={{flex:1,overflow:'auto',display:'flex',minWidth:0,scrollbarWidth:'thin',scrollbarColor:'#ffffff20 transparent'}} onScroll={e=>{setScroll(Math.round(e.target.scrollTop/16))}}>
        {/* Line numbers gutter */}
        <div style={{padding:'4px 0',width:28,textAlign:'right',userSelect:'none',borderRight:'1px solid #ffffff08',background:'#16162a',flexShrink:0,transition:trans}}>
          {lines.map((_,i)=><div key={i} style={{fontSize:cfs(9),lineHeight:Math.round(16*fsize)+'px',color:i===9?'#f9e2af':'#444',paddingRight:6,transition:'color 0.2s ease'}}>{i+1}</div>)}
        </div>
        {/* Code lines */}
        <div style={{padding:'4px 8px',minWidth:0}}>
          {lines.map((l,i)=><div key={i} style={{fontSize:cfs(10),lineHeight:Math.round(16*fsize)+'px',whiteSpace:'pre',background:i===9?'#f9e2af08':'transparent',transition:'background 0.2s ease'}}><HighlightLine text={l}/></div>)}
        </div>
      </div>
      {/* Minimap panel */}
      <div style={{width:44,background:'#16162a',borderLeft:'1px solid #ffffff08',position:'relative',flexShrink:0,overflow:'hidden',transition:trans}}>
        {/* Viewport handle with hover effect */}
        <div
          onMouseEnter={()=>setHoveredBtn('viewport')}
          onMouseLeave={()=>setHoveredBtn(null)}
          style={{
            position:'absolute',top:scroll*16*mmScale,left:0,right:0,
            height:visible*16*mmScale,
            background:hoveredBtn==='viewport'?'#cba6f740':'#cba6f720',
            borderRadius:1,
            cursor:'grab',
            transform:hoveredBtn==='viewport'?'scaleX(1.05)':'scaleX(1)',
            transition:trans
          }}
        />
        {lines.map((l,i)=><div key={i} style={{height:16*mmScale,padding:'0 3px',overflow:'hidden'}}>
          <div style={{height:'100%',display:'flex',gap:1}}>
            {tokenize(l).filter(t=>t.v.trim()).slice(0,8).map((t,j)=><div key={j} style={{width:Math.min(t.v.length*1.5,8),height:1.5,background:TC[t.c]||'#555',opacity:.5,borderRadius:.5,alignSelf:'center',transition:'opacity 0.2s ease'}}/>)}
          </div>
        </div>)}
      </div>
    </div>
    {/* Status bar with backdrop blur */}
    <div style={{display:'flex',alignItems:'center',padding:'3px 10px',borderTop:'1px solid #ffffff08',gap:6,backdropFilter:'blur(8px)',WebkitBackdropFilter:'blur(8px)',transition:trans}}>
      <span style={{fontSize:8,color:'#27c93f',transition:trans}}>●</span>
      <span style={{fontSize:8,color:'#555',transition:trans}}>Ln 10, Col 1</span>
      <span style={{fontSize:8,color:'#555',marginLeft:'auto',transition:trans}}>JavaScript</span>
    </div>
  </div>;
}
