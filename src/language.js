import {translateText} from './locales.js';

export let language='en';
const textSources=new WeakMap(),attributeSources=new WeakMap();
const translatedAttributes=['aria-label','placeholder','title'];
let observer;

const titleSource=document.title;

function translateNode(node,refreshSource=false){
  if(node.nodeType===Node.TEXT_NODE){
    const previous=textSources.get(node);
    if(previous===undefined||refreshSource&&node.data!==translateText(previous,language))textSources.set(node,node.data);
    const next=translateText(textSources.get(node),language);
    if(node.data!==next)node.data=next;
    return;
  }
  if(node.nodeType!==Node.ELEMENT_NODE||node.closest?.('[data-i18n-ignore]'))return;
  let sources=attributeSources.get(node);
  if(!sources){sources={};attributeSources.set(node,sources);}
  for(const name of translatedAttributes){
    if(!node.hasAttribute(name))continue;
    const current=node.getAttribute(name),previous=sources[name];
    if(previous===undefined||refreshSource&&current!==translateText(previous,language))sources[name]=current;
    const next=translateText(sources[name],language);
    if(current!==next)node.setAttribute(name,next);
  }
  for(const child of node.childNodes)translateNode(child,refreshSource);
}

function renderLanguage(){
  document.documentElement.lang=language;
  document.title=translateText(titleSource,language);
  translateNode(document.body);
  document.querySelectorAll('[data-language]').forEach(button=>{
    const selected=button.dataset.language===language;
    button.classList.toggle('selected',selected);
    button.setAttribute('aria-pressed',String(selected));
  });
}

export function setLanguage(next,{remember=true}={}){
  if(!document.getElementById('start')||document.getElementById('start').hidden)return language;
  language=next==='ja'?'ja':'en';
  if(remember)try{sessionStorage.setItem('ayh-language',language);}catch{}
  renderLanguage();
  window.dispatchEvent(new CustomEvent('ayh-language',{detail:{language}}));
}

export function initLanguage(){
  try{language=sessionStorage.getItem('ayh-language')==='ja'?'ja':'en';}catch{language='en';}
  document.querySelectorAll('[data-language]').forEach(button=>button.addEventListener('click',()=>setLanguage(button.dataset.language)));
  observer=new MutationObserver(records=>{
    observer.disconnect();
    for(const record of records){
      if(record.type==='childList')for(const node of record.addedNodes)translateNode(node,true);
      else translateNode(record.target,true);
    }
    observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:translatedAttributes});
  });
  renderLanguage();
  observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:translatedAttributes});
  return language;
}

export const t=value=>translateText(value,language);
