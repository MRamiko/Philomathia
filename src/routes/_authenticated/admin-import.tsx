import {createFileRoute} from '@tanstack/react-router';
import {useServerFn} from '@tanstack/react-start';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {useEffect,useRef,useState} from 'react';
import {Button} from '@/components/auth-form';
import {Shell,Loading} from '@/components/phi';
import {useLocale} from '@/lib/locale';
import {useMe} from '@/lib/data';
import {importBatch,importProgress} from '@/lib/import.functions';
import {PASSES} from '@/lib/import-rules';
import {queueImportCommand,type ImportCommand} from '@/lib/import-controls';
export const Route=createFileRoute('/_authenticated/admin-import')({head:()=>({meta:[{title:'Catalog imports · Philomathia'},{name:'description',content:'Manage official catalog imports and coverage in Philomathia.'},{property:'og:title',content:'Catalog imports · Philomathia'},{property:'og:description',content:'Administrator catalog imports and coverage.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'}]}),component:AdminImport});
function AdminImport(){
 const {t}=useLocale();const me=useMe();const progress=useServerFn(importProgress);const batch=useServerFn(importBatch);const qc=useQueryClient();const busy=useRef(false);const stopped=useRef(false);const queued=useRef<ImportCommand[]>([]);const [error,setError]=useState('');
 const admin=me.data?.roles.includes('admin')??false;
 const state=useQuery({queryKey:['import-progress'],queryFn:()=>progress(),enabled:admin,refetchInterval:3000});
 async function action(pass:string,kind:'start'|'pause'|'resume'|'batch'){
  if(busy.current){if(kind!=='batch')queued.current=queueImportCommand(queued.current,{pass,action:kind});return;}
  busy.current=true;setError('');try{await batch({data:{pass,action:kind}});while(queued.current.length){const command=queued.current.shift();if(command)await batch({data:command});}await qc.invalidateQueries({queryKey:['import-progress']});await qc.invalidateQueries({queryKey:['items']});}catch{setError(t('Import failed. Please retry.'));}finally{busy.current=false;}
 }
 useEffect(()=>{stopped.current=false;const timer=setInterval(()=>{if(stopped.current||busy.current)return;const running=state.data?.jobs.find(j=>j.status==='running');if(running)void action(running.pass_name,'batch');},1000);return()=>{stopped.current=true;clearInterval(timer);};},[state.data]);
 if(!me.data)return <Shell><Loading/></Shell>;
 if(!admin)return <Shell><p className="error">{t('Not found.')}</p></Shell>;
 return <Shell><h1 className="h1">{t('Admin Import')}</h1>{error&&<p className="error" role="alert">{error}</p>}{state.error?<p className="error">{t('Could not load.')}<Button onClick={()=>state.refetch()}>{t('Retry')}</Button></p>:!state.data?<Loading/>:<>
 <p className="small muted">{t('Administrator access confirmed')} · {t(state.data.tmdbConfigured?'TMDB key saved':'TMDB key required')}</p>
 {PASSES.map(pass=>{const job=state.data.jobs.find(j=>j.pass_name===pass.id);return <div className="box stack" key={pass.id}><h2 className="h2">{pass.id} · {t(pass.label)}</h2><span>{job?.imported_count??0}{pass.target?' / '+pass.target:''} · {t(job?.status??'pending')}</span><span className="small muted">{t('Skipped')}: {job?.skipped_count??0}</span>{job?.last_error&&<p className="error">{job.last_error==='TMDB key required'?t('TMDB key required'):t('Import failed. Please retry.')}</p>}{pass.provider==='tmdb'&&!state.data.tmdbConfigured?<p className="error">{t('TMDB key required')}</p>:<div className="row"><Button disabled={job?.status==='done'||job?.status==='running'} onClick={()=>action(pass.id,job?'resume':'start')}>{t(job?'Resume':'Start')}</Button><Button disabled={job?.status!=='running'} onClick={()=>action(pass.id,'pause')}>{t('Pause')}</Button></div>}</div>;})}
 <h2 className="h2">{t('Coverage')}</h2>{state.data.coverage.map(c=><div className="box stack" key={c.media}><strong>{t(c.media==='film'?'Films':'Books')}</strong><span>{t('Total')}: {c.total} · {t('Georgian')}: {c.georgian}</span><span>{t('With image')}: {c.image}</span><span>{t('With description')}: {c.description}</span><span>{t('With Georgian title')}: {c.georgianTitle}</span><span>{t('With 3 moods')}: {c.moods}</span></div>)}<p>{t('Duplicates')}: {state.data.duplicates}</p></>}
 <p className="small muted">{t('This product uses the TMDB API but is not endorsed or certified by TMDB.')}</p></Shell>;
}