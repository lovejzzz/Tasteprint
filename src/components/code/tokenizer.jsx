/* ---- JS TOKENIZER for syntax highlighting ---- */
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
  return <>{tokens.map((t,i)=><span key={i} style={{color:TC[t.c]||'#cdd6f4'}}>{t.v}</span>)}</>;
}
