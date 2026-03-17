/* ---- JS TOKENIZER for syntax highlighting ---- */
import React from "react";
import { getTextureStyle } from "../../utils";

const KW=/^(const|let|var|function|return|if|else|for|while|do|class|import|export|from|new|typeof|instanceof|async|await|try|catch|throw|switch|case|break|continue|default|of|in|yield|extends|super|static|get|set|delete|void)$/;
const BI=/^(console|Math|Array|Object|String|Number|JSON|Promise|setTimeout|setInterval|clearTimeout|clearInterval|document|window|null|undefined|true|false|NaN|Infinity|Error|Map|Set|RegExp|Date|parseInt|parseFloat|isNaN|require|module|exports)$/;

export function tokenize(code){
  const t=[];let i=0;
  while(i<code.length){
    if(code[i]==='/'&&code[i+1]==='/'){let e=code.indexOf('\n',i);if(e===-1)e=code.length;t.push({c:'cm',v:code.slice(i,e)});i=e;continue;}
    if(code[i]==='/'&&code[i+1]==='*'){let e=code.indexOf('*/',i+2);if(e===-1)e=code.length;else e+=2;t.push({c:'cm',v:code.slice(i,e)});i=e;continue;}
    if(code[i]==='"'||code[i]==="'"||code[i]==='`'){const q=code[i];let j=i+1;while(j<code.length&&code[j]!==q){if(code[j]==='\\')j++;j++;}t.push({c:'st',v:code.slice(i,j+1)});i=j+1;continue;}
    if(/[0-9]/.test(code[i])){let j=i;while(j<code.length&&/[0-9.exb_]/.test(code[j]))j++;t.push({c:'nu',v:code.slice(i,j)});i=j;continue;}
    if(/[a-zA-Z_$]/.test(code[i])){let j=i;while(j<code.length&&/[a-zA-Z0-9_$]/.test(code[j]))j++;const w=code.slice(i,j);t.push({c:KW.test(w)?'kw':BI.test(w)?'bi':'id',v:w});i=j;continue;}
    if(code[i]==='='&&code[i+1]==='>'){t.push({c:'op',v:'=>'});i+=2;continue;}
    if(/[+\-*/%=<>!&|^~?:;,.(){}[\]]/.test(code[i])){t.push({c:'op',v:code[i]});i++;continue;}
    t.push({c:'tx',v:code[i]});i++;
  }
  return t;
}

export const TC={kw:'#cba6f7',bi:'#f9e2af',st:'#a6e3a1',nu:'#fab387',cm:'#585b70',op:'#9399b2',id:'#cdd6f4',tx:'#cdd6f4'};

export function HighlightLine({text}){
  const tokens=tokenize(text);
  return <>{tokens.map((t,i)=><span key={i} style={{color:TC[t.c]||'#cdd6f4',transition:'color 0.2s ease'}}>{t.v}</span>)}</>;
}

/* ---- Token category labels ---- */
const CAT_LABELS={kw:'keyword',bi:'built-in',st:'string',nu:'number',cm:'comment',op:'operator',id:'identifier',tx:'text'};

/* ---- Default export: Tokenizer visualization component ---- */
export default function Tokenizer({b,fsize=1,texture,p={}}){
  const mono="'JetBrains Mono',monospace";
  const cfs=n=>Math.round(n*fsize);
  const [hovTok,setHovTok]=React.useState(-1);
  const [activeLine,setActiveLine]=React.useState(0);
  const [showTooltip,setShowTooltip]=React.useState(false);

  const code=[
    "const greet = (name) => {",
    "  console.log(`Hello, ${name}!`);",
    "  return true;",
    "};",
  ];

  const lines=code.map(l=>tokenize(l));
  const activeTokens=lines[activeLine]||[];

  return (
    <div style={{
      ...b,
      background:'#1e1e2e',
      borderRadius:12,
      display:'flex',
      flexDirection:'column',
      overflow:'hidden',
      fontFamily:mono,
      scrollbarWidth:'thin',
      ...getTextureStyle(texture,p),
    }}>
      {/* Title bar */}
      <div style={{
        display:'flex',alignItems:'center',padding:'5px 12px',
        borderBottom:'1px solid #ffffff10',gap:6,
        transition:'background 0.2s ease',
      }}>
        <div style={{display:'flex',gap:4}}>
          {['#ff5f56','#ffbd2e','#27c93f'].map((c,i)=>(
            <div key={i} style={{
              width:7,height:7,borderRadius:999,background:c,opacity:.7,
              transition:'transform 0.15s ease, opacity 0.15s ease',
              cursor:'pointer',
            }}
            onMouseEnter={e=>{e.currentTarget.style.transform='scale(1.3)';e.currentTarget.style.opacity='1';}}
            onMouseLeave={e=>{e.currentTarget.style.transform='scale(1)';e.currentTarget.style.opacity='.7';}}
            />
          ))}
        </div>
        <span style={{fontSize:cfs(9),color:'#585b70',marginLeft:6}}>tokenizer</span>
        <span style={{fontSize:cfs(8),color:'#45475a',marginLeft:'auto'}}>JS</span>
      </div>

      {/* Source code pane */}
      <div style={{
        padding:'8px 0',borderBottom:'1px solid #ffffff08',
        overflow:'auto',scrollbarWidth:'thin',
      }}>
        {code.map((line,li)=>(
          <div key={li}
            onClick={()=>setActiveLine(li)}
            style={{
              display:'flex',gap:10,padding:'1px 12px',cursor:'pointer',
              background:li===activeLine?'#cba6f710':'transparent',
              borderLeft:li===activeLine?'2px solid #cba6f7':'2px solid transparent',
              transition:'background 0.2s ease, border-color 0.2s ease',
            }}
            onMouseEnter={e=>{if(li!==activeLine)e.currentTarget.style.background='#ffffff06';}}
            onMouseLeave={e=>{if(li!==activeLine)e.currentTarget.style.background='transparent';}}
          >
            <span style={{fontSize:cfs(9),color:li===activeLine?'#cba6f7':'#45475a',width:14,textAlign:'right',userSelect:'none',transition:'color 0.2s ease'}}>{li+1}</span>
            <span style={{fontSize:cfs(10),lineHeight:1.7,whiteSpace:'pre'}}><HighlightLine text={line}/></span>
          </div>
        ))}
      </div>

      {/* Token breakdown pane */}
      <div style={{flex:1,padding:'8px 12px',overflow:'auto',scrollbarWidth:'thin',minHeight:0}}>
        <div style={{fontSize:cfs(8),color:'#585b70',marginBottom:6,textTransform:'uppercase',letterSpacing:'0.06em'}}>Tokens · Line {activeLine+1}</div>
        <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
          {activeTokens.map((tok,ti)=>{
            const isHov=hovTok===ti;
            return (
              <div key={ti}
                onMouseEnter={()=>{setHovTok(ti);setShowTooltip(true);}}
                onMouseLeave={()=>{setHovTok(-1);setShowTooltip(false);}}
                style={{
                  position:'relative',
                  padding:'2px 6px',
                  borderRadius:4,
                  fontSize:cfs(10),
                  color:TC[tok.c]||'#cdd6f4',
                  background:isHov?`${TC[tok.c]||'#cdd6f4'}18`:'#ffffff06',
                  border:`1px solid ${isHov?`${TC[tok.c]||'#cdd6f4'}40`:'#ffffff08'}`,
                  cursor:'default',
                  whiteSpace:'pre',
                  transition:'background 0.15s ease, border-color 0.15s ease, transform 0.15s ease',
                  transform:isHov?'scale(1.05)':'scale(1)',
                }}
              >
                {tok.v}
                {/* Tooltip with backdrop blur */}
                {isHov&&showTooltip&&(
                  <div style={{
                    position:'absolute',
                    bottom:'calc(100% + 6px)',left:'50%',transform:'translateX(-50%)',
                    padding:'3px 8px',borderRadius:6,
                    background:'#181825e0',
                    backdropFilter:'blur(8px)',
                    WebkitBackdropFilter:'blur(8px)',
                    border:'1px solid #ffffff12',
                    fontSize:cfs(8),color:'#a6adc8',
                    whiteSpace:'nowrap',
                    pointerEvents:'none',
                    zIndex:10,
                    transition:'opacity 0.15s ease',
                  }}>
                    {CAT_LABELS[tok.c]||'text'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Status bar */}
      <div style={{
        display:'flex',alignItems:'center',padding:'3px 10px',
        borderTop:'1px solid #ffffff08',gap:6,
        transition:'background 0.2s ease',
      }}>
        <span style={{fontSize:cfs(8),color:'#27c93f'}}>●</span>
        <span style={{fontSize:cfs(8),color:'#45475a'}}>{activeTokens.length} tokens</span>
        <span style={{fontSize:cfs(8),color:'#45475a',marginLeft:'auto'}}>
          {Object.entries(activeTokens.reduce((a,t)=>{a[t.c]=(a[t.c]||0)+1;return a;},{})).map(([k,v])=>`${CAT_LABELS[k]||k}:${v}`).join(' · ')}
        </span>
      </div>
    </div>
  );
}
