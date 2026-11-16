import React,{useEffect,useRef} from 'react';
import renderMathInElement from 'katex/contrib/auto-render';
import 'katex/dist/katex.min.css';

export default function MathMessage({text}){
 const root=useRef(null);
 useEffect(()=>{
  const element=root.current;
  // Insert untrusted model output as text, never as HTML.
  element.textContent=text;
  renderMathInElement(element,{
   delimiters:[
    {left:'$$',right:'$$',display:true},
    {left:'\\[',right:'\\]',display:true},
    {left:'\\(',right:'\\)',display:false},
    {left:'$',right:'$',display:false},
    {left:'\\begin{equation}',right:'\\end{equation}',display:true},
    {left:'\\begin{align}',right:'\\end{align}',display:true},
   ],
   throwOnError:false,trust:false,strict:'ignore',errorColor:'#40553e',maxExpand:500,maxSize:10,
  });
 },[text]);
 return <div className="math-message" ref={root}/>;
}
