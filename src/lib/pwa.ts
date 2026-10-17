export function initializePwa(){
 if(!('serviceWorker' in navigator))return;
 const preview=location.hostname==='localhost'||location.hostname.includes('preview')||window.self!==window.top;
 if(preview)return;
 navigator.serviceWorker.register('/sw.js').catch(()=>{});
}
export function rememberTab(path:string){if(['/discover','/search','/library','/ask','/profile'].includes(path))localStorage.setItem('phi-tab',path);}
export function rememberedTab(){const path=localStorage.getItem('phi-tab');return ['/discover','/search','/library','/ask','/profile'].includes(path??'')?path:'/discover';}
