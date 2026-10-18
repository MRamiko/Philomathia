import { captureError } from './startup-diagnostics';
export function initializePwa(){
 const chunkFailure=(event:Event)=>{event.preventDefault();try{if(sessionStorage.getItem('phi-chunk-reload')!=='1'){sessionStorage.setItem('phi-chunk-reload','1');location.reload();}else captureError('A script could not load. Reload the app.');}catch{captureError('A script could not load. Reload the app.');}};
 window.addEventListener('vite:preloadError',chunkFailure,{once:true});
 if(!('serviceWorker' in navigator))return;
 const preview=location.hostname==='localhost'||location.hostname.includes('preview')||window.self!==window.top;
 if(preview)return;
 navigator.serviceWorker.register('/sw.js').catch(captureError);
}
export function rememberTab(path:string){try{if(['/discover','/search','/library','/ask','/profile'].includes(path))localStorage.setItem('phi-tab',path);}catch{captureError('Local preferences could not be saved');}}
export function rememberedTab(){try{const path=localStorage.getItem('phi-tab');return ['/discover','/search','/library','/ask','/profile'].includes(path??'')?path:'/discover';}catch{return '/discover';}}
