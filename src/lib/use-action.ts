import { useRef,useState } from 'react';
import {useLocale} from './locale';
export function useAction(){
 const lock=useRef(false);const [busy,setBusy]=useState(false);const [error,setError]=useState('');const {t}=useLocale();
 async function run(action:()=>Promise<unknown>,optimistic?:()=>void,rollback?:()=>void){if(lock.current)return;lock.current=true;setBusy(true);setError('');optimistic?.();try{await action();}catch{rollback?.();setError(t('Could not save. Please retry.'));}finally{lock.current=false;setBusy(false);}}
 return {busy,error,run};
}
