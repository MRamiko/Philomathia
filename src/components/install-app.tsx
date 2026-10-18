import {useEffect,useState} from 'react';
import {Button} from './auth-form';
type InstallEvent=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:string}>};
export function InstallApp(){
 const [prompt,setPrompt]=useState<InstallEvent|null>(null);const [installed,setInstalled]=useState(false);
 useEffect(()=>{setInstalled(window.matchMedia('(display-mode: standalone)').matches);const capture=(event:Event)=>{event.preventDefault();setPrompt(event as InstallEvent);};const done=()=>{setInstalled(true);setPrompt(null);};window.addEventListener('beforeinstallprompt',capture);window.addEventListener('appinstalled',done);return()=>{window.removeEventListener('beforeinstallprompt',capture);window.removeEventListener('appinstalled',done);};},[]);
 return <div className="stack"><Button disabled={!prompt||installed} onClick={async()=>{if(!prompt)return;await prompt.prompt();await prompt.userChoice;setPrompt(null);}}>{installed?'App installed':'Install app'}</Button>{!prompt&&!installed&&<p className="small muted">Installation is available from your browser menu on the published site.</p>}</div>;
}