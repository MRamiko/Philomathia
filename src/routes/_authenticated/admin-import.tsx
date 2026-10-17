import {createFileRoute} from '@tanstack/react-router';
import {useServerFn} from '@tanstack/react-start';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {useEffect,useRef,useState} from 'react';
import {Button} from '@/components/auth-form';
import {ConfirmDialog,MotionList,Presence} from '@/components/motion';
import {Shell,Loading} from '@/components/phi';
import {useLocale} from '@/lib/locale';
import {useMe} from '@/lib/data';
import {importBatch,importProgress} from '@/lib/import.functions';
import {checkKeys,filmSearch,filmCommit,bookSearch,bookCommit,wikidataSearch,wikidataCommit} from '@/lib/admin-import.functions';
import {PASSES} from '@/lib/import-rules';
import {queueImportCommand,type ImportCommand} from '@/lib/import-controls';
export const Route=createFileRoute('/_authenticated/admin-import')({head:()=>({meta:[{title:'Catalog imports · Philomathia'},{name:'description',content:'Manage official catalog imports and coverage in Philomathia.'},{property:'og:title',content:'Catalog imports · Philomathia'},{property:'og:description',content:'Administrator catalog imports and coverage.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'}]}),component:AdminImport});
type Summary={imported:number;updated:number;skipped:number;failed:{label:string;reason:string}[]};
function AdminImport(){
 const {t}=useLocale();const me=useMe();const qc=useQueryClient();
 const [tab,setTab]=useState<'status'|'films'|'books'|'georgian'|'bulk'>('status');
 const admin=me.data?.roles.includes('admin')??false;
 const check=useServerFn(checkKeys);
 const keys=useQuery({queryKey:['check-keys'],queryFn:()=>check(),enabled:admin});
 if(!me.data)return <Shell><Loading/></Shell>;
 if(!admin)return <Shell><p className="error">{t('Not allowed.')}</p></Shell>;
 const tabs=[['status',t('Status')],['films',t('Films')],['books',t('Books')],['georgian',t('Georgian works')],['bulk',t('Bulk')]] as const;
 return <Shell><h1 className="h1">{t('Admin Import')}</h1>
 <div className="row" role="tablist">{tabs.map(([id,label])=><button key={id} role="tab" aria-selected={tab===id} className={`chip ${tab===id?'chip-active':''}`} onClick={()=>setTab(id)}>{label}</button>)}</div>
 {tab==='status'&&<StatusTab t={t} keys={keys}/>}
 {tab==='films'&&<FilmsTab t={t} tmdbOk={keys.data?.tmdb==='working'}/>}
 {tab==='books'&&<BooksTab t={t}/>}
 {tab==='georgian'&&<GeorgianTab t={t}/>}
 {tab==='bulk'&&<BulkTab t={t} qc={qc}/>}
 <p className="small muted">{t('This product uses the TMDB API but is not endorsed or certified by TMDB.')}</p></Shell>;
}
function StatusTab({t,keys}:{t:(k:string,params?:Record<string,string|number>)=>string;keys:any}){
 const progress=useServerFn(importProgress);
 const state=useQuery({queryKey:['import-progress'],queryFn:()=>progress()});
 return <div className="stack">
 <h2 className="h2">{t('Providers')}</h2>
 {[['TMDB',keys.data?.tmdb],['Google Books',keys.data?.google]].map(([name,status])=><div className="box between" key={name as string}><strong>{name}</strong><span className={status==='working'?'ok small':status?'error small':'muted small'}>{status==='working'?t('Configured and working'):status==='rejected'?t('Configured but rejected'):keys.data?t('Missing'):t('Loading…')}</span></div>)}
 {keys.data&&keys.data.tmdb!=='working'&&<p className="error small">{t('Add the secret named TMDB_API_KEY.')}</p>}
 <Button disabled={keys.isFetching} onClick={()=>keys.refetch()}>{t('Re-check')}</Button>
 <h2 className="h2">{t('Coverage')}</h2>
 {state.error?<p className="error">{t('Could not load.')}<Button onClick={()=>state.refetch()}>{t('Retry')}</Button></p>:!state.data?<Loading/>:<>
 {state.data.coverage.map((c:any)=><div className="box stack" key={c.media}><strong>{t(c.media==='film'?'Films':'Books')}</strong><span>{t('Total')}: {c.total} · {t('Georgian')}: {c.georgian}</span><span>{t('With image')}: {c.image}</span><span>{t('With description')}: {c.description}</span><span>{t('With Georgian title')}: {c.georgianTitle}</span><span>{t('With 3 moods')}: {c.moods}</span></div>)}
 <p>{t('Duplicates')}: {state.data.duplicates}</p></>}
 </div>;
}
function SummaryView({t,summary,onRetry,onBack}:{t:(k:string,params?:Record<string,string|number>)=>string;summary:Summary;onRetry:()=>void;onBack:()=>void}){
 return <div className="box stack"><h2 className="h2">{t('Summary')}</h2>
 <span>{t('Imported')}: {summary.imported} · {t('Updated')}: {summary.updated} · {t('Skipped')}: {summary.skipped} · {t('Failed')}: {summary.failed.length}</span>
 {summary.failed.map((f,i)=><span key={i} className="error small">{f.label}: {f.reason}</span>)}
 <div className="row">{summary.failed.length>0&&<Button onClick={onRetry}>{t('Retry failed')}</Button>}<Button onClick={onBack}>{t('Back to search')}</Button></div></div>;
}
function FilmsTab({t,tmdbOk}:{t:(k:string,params?:Record<string,string|number>)=>string;tmdbOk:boolean}){
 const search=useServerFn(filmSearch);const commit=useServerFn(filmCommit);
 const [query,setQuery]=useState('');const [year,setYear]=useState('');const [mode,setMode]=useState<'search'|'georgian'|'top'>('search');
 const [result,setResult]=useState<any>(null);const [selected,setSelected]=useState<Set<number>>(new Set());
 const [confirming,setConfirming]=useState(false);const [summary,setSummary]=useState<Summary|null>(null);const [lastIds,setLastIds]=useState<number[]>([]);
 const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 async function runSearch(m:typeof mode,page=1){setBusy(true);setError('');setSummary(null);try{setMode(m);const r=await search({data:{query,year:year?Number(year):undefined,mode:m,page}});setResult(r);setSelected(new Set());}catch(e){setError(e instanceof Error&&e.message==='TMDB key required'?t('TMDB key required'):t('Import failed. Please retry.'));}finally{setBusy(false);}}
 async function runCommit(ids:number[]){setBusy(true);setError('');try{const s=await commit({data:{ids}});setSummary(s);setLastIds(ids);setConfirming(false);}catch{setError(t('Import failed. Please retry.'));}finally{setBusy(false);}}
 if(!tmdbOk)return <p className="error">{t('TMDB key required')} · {t('Add the secret named TMDB_API_KEY.')}</p>;
 if(summary)return <SummaryView t={t} summary={summary} onRetry={()=>runCommit(lastIds)} onBack={()=>setSummary(null)}/>;
 const newRows=(result?.rows??[]).filter((r:any)=>!r.existing);
 return <div className="stack">
 <div className="row"><input className="input" style={{flex:1}} placeholder={t('Film title')} value={query} onChange={e=>setQuery(e.target.value)}/><input className="input" style={{width:90}} placeholder={t('Year')} inputMode="numeric" value={year} onChange={e=>setYear(e.target.value)}/></div>
 <div className="row"><Button className="btn-primary" disabled={busy||!query.trim()} onClick={()=>runSearch('search')}>{t('Find')}</Button><Button disabled={busy} onClick={()=>runSearch('georgian')}>{t('Georgian films')}</Button><Button disabled={busy} onClick={()=>runSearch('top')}>{t('Top rated international')}</Button></div>
 {error&&<p className="error" role="alert">{error}</p>}
 {busy&&<Loading/>}
 {result&&<>
 <div className="row"><Button onClick={()=>setSelected(new Set(newRows.map((r:any)=>r.tmdb_id)))}>{t('Select all new')}</Button><Button onClick={()=>setSelected(new Set())}>{t('Clear')}</Button><span className="muted small">{selected.size} {t('selected')}</span></div>
 <MotionList scope="film-review">{result.rows.map((r:any)=><label key={r.tmdb_id} className="list-item" style={{opacity:r.existing?0.5:1}}>
  {r.poster_path?<img src={`https://image.tmdb.org/t/p/w154${r.poster_path}`} alt={r.title} width={100} height={150} loading="lazy" decoding="async" style={{borderRadius:8,objectFit:'cover'}}/>:<span className="poster poster-sm"><span>{t('Film')}</span></span>}
  <span className="stack" style={{flex:1,minWidth:0}}><strong className="clamp2">{r.title}</strong><span className="muted small">{r.year??''} · {r.language} · ★ {Number(r.rating).toFixed(1)}</span><span className="small">{r.existing?t('Already exists'):t('New')}</span></span>
  <input type="checkbox" style={{width:24,height:24}} disabled={Boolean(r.existing)} checked={selected.has(r.tmdb_id)} onChange={e=>{const next=new Set(selected);if(e.target.checked)next.add(r.tmdb_id);else next.delete(r.tmdb_id);setSelected(next);}}/>
 </label>)}</MotionList>
 {result.page<result.totalPages&&<Button disabled={busy} onClick={async()=>{setBusy(true);try{const r=await search({data:{query,year:year?Number(year):undefined,mode,page:result.page+1}});setResult({...r,rows:[...result.rows,...r.rows]});}finally{setBusy(false);}}}>{t('Load more')}</Button>}
 <Button className="btn-primary" disabled={!selected.size||busy} onClick={()=>setConfirming(true)}>{t('Import selected')}</Button>
 {confirming&&<ConfirmDialog message={t('Import {count} films?',{count:selected.size})} onClose={()=>setConfirming(false)} onConfirm={()=>runCommit([...selected])}/>}
 </>}
 </div>;
}
function BooksTab({t}:{t:(k:string,params?:Record<string,string|number>)=>string}){
 const search=useServerFn(bookSearch);const commit=useServerFn(bookCommit);
 const [query,setQuery]=useState('');const [provider,setProvider]=useState<'openlibrary'|'google'>('openlibrary');const [georgian,setGeorgian]=useState(false);
 const [result,setResult]=useState<any>(null);const [selected,setSelected]=useState<Set<string>>(new Set());
 const [confirming,setConfirming]=useState(false);const [summary,setSummary]=useState<Summary|null>(null);const [lastRows,setLastRows]=useState<any[]>([]);
 const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 async function runSearch(page=1){setBusy(true);setError('');setSummary(null);try{const r=await search({data:{query,provider,georgian,page}});setResult(r);setSelected(new Set());}catch(e){setError(e instanceof Error&&e.message.includes('key')?t('Google Books key required'):t('Import failed. Please retry.'));}finally{setBusy(false);}}
 async function runCommit(rows:any[]){setBusy(true);setError('');try{const s=await commit({data:{rows}});setSummary(s);setLastRows(rows);setConfirming(false);}catch{setError(t('Import failed. Please retry.'));}finally{setBusy(false);}}
 if(summary)return <SummaryView t={t} summary={summary} onRetry={()=>runCommit(lastRows)} onBack={()=>setSummary(null)}/>;
 const newRows=(result?.rows??[]).filter((r:any)=>!r.exists);
 const chosen=(result?.rows??[]).filter((r:any)=>selected.has(r.key));
 return <div className="stack">
 <div className="row"><input className="input" style={{flex:1}} placeholder={t('Book title')} value={query} onChange={e=>setQuery(e.target.value)}/></div>
 <div className="row"><button className={`chip ${provider==='openlibrary'?'chip-active':''}`} onClick={()=>setProvider('openlibrary')}>Open Library</button><button className={`chip ${provider==='google'?'chip-active':''}`} onClick={()=>setProvider('google')}>Google Books</button><button className={`chip ${georgian?'chip-active':''}`} onClick={()=>setGeorgian(!georgian)}>{t('Georgian author')}</button></div>
 <Button className="btn-primary" disabled={busy||(!query.trim()&&!georgian)} onClick={()=>runSearch()}>{t('Find')}</Button>
 {error&&<p className="error" role="alert">{error}</p>}
 {busy&&<Loading/>}
 {result&&<>
 <div className="row"><Button onClick={()=>setSelected(new Set(newRows.map((r:any)=>r.key)))}>{t('Select all new')}</Button><Button onClick={()=>setSelected(new Set())}>{t('Clear')}</Button><span className="muted small">{selected.size} {t('selected')}</span></div>
 <MotionList scope="book-review">{result.rows.map((r:any)=><label key={r.key} className="list-item" style={{opacity:r.exists?0.5:1}}>
  {r.cover?<img src={r.cover} alt={r.title} width={100} height={150} loading="lazy" decoding="async" style={{borderRadius:8,objectFit:'cover'}}/>:<span className="poster poster-sm"><span>{t('Book')}</span></span>}
  <span className="stack" style={{flex:1,minWidth:0}}><strong className="clamp2">{r.title}</strong><span className="muted small">{r.author} · {r.year??''}{r.pages?` · ${r.pages} ${t('pages')}`:''}</span><span className="small">{r.exists?t('Already exists'):t('New')}</span></span>
  <input type="checkbox" style={{width:24,height:24}} disabled={Boolean(r.exists)} checked={selected.has(r.key)} onChange={e=>{const next=new Set(selected);if(e.target.checked)next.add(r.key);else next.delete(r.key);setSelected(next);}}/>
 </label>)}</MotionList>
 {result.page<result.totalPages&&<Button disabled={busy} onClick={async()=>{setBusy(true);try{const r=await search({data:{query,provider,georgian,page:result.page+1}});setResult({...r,rows:[...result.rows,...r.rows]});}finally{setBusy(false);}}}>{t('Load more')}</Button>}
 <Button className="btn-primary" disabled={!selected.size||busy} onClick={()=>setConfirming(true)}>{t('Import selected')}</Button>
 {confirming&&<ConfirmDialog message={t('Import {count} books?',{count:selected.size})} onClose={()=>setConfirming(false)} onConfirm={()=>runCommit(chosen)}/>}
 </>}
 </div>;
}
function GeorgianTab({t}:{t:(k:string,params?:Record<string,string|number>)=>string}){
 const search=useServerFn(wikidataSearch);const commit=useServerFn(wikidataCommit);
 const [kind,setKind]=useState<'films'|'books'|null>(null);const [result,setResult]=useState<any>(null);const [selected,setSelected]=useState<Set<string>>(new Set());
 const [confirming,setConfirming]=useState(false);const [summary,setSummary]=useState<Summary|null>(null);const [lastRows,setLastRows]=useState<any[]>([]);
 const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 async function runSearch(k:'films'|'books'){setBusy(true);setError('');setSummary(null);setKind(k);try{const r=await search({data:{kind:k}});setResult(r);setSelected(new Set(r.rows.filter((x:any)=>!x.existing||x.existing.willUpdate).map((x:any)=>x.wikidata_id)));}catch{setError(t('Import failed. Please retry.'));}finally{setBusy(false);}}
 async function runCommit(rows:any[]){if(!kind)return;setBusy(true);setError('');try{const s=await commit({data:{kind,rows}});setSummary(s);setLastRows(rows);setConfirming(false);}catch{setError(t('Import failed. Please retry.'));}finally{setBusy(false);}}
 if(summary)return <SummaryView t={t} summary={summary} onRetry={()=>runCommit(lastRows)} onBack={()=>setSummary(null)}/>;
 const chosen=(result?.rows??[]).filter((r:any)=>selected.has(r.wikidata_id));
 return <div className="stack">
 <div className="row"><Button className="btn-primary" disabled={busy} onClick={()=>runSearch('films')}>{t('Georgian films')}</Button><Button className="btn-primary" disabled={busy} onClick={()=>runSearch('books')}>{t('Georgian books')}</Button></div>
 {error&&<p className="error" role="alert">{error}</p>}
 {busy&&<Loading/>}
 {result&&<>
 <MotionList scope="wikidata-review">{result.rows.map((r:any)=><label key={r.wikidata_id} className="list-item">
  <span className="stack" style={{flex:1,minWidth:0}}><strong className="clamp2">{r.title_ka??r.title_en}</strong>{r.title_ka&&<span className="muted small clamp2">{r.title_en}</span>}<span className="muted small">{r.creator} · {r.year??''}</span><span className="small">{r.existing?(r.existing.willUpdate?t('Will update'):t('Already exists')):t('New')}</span></span>
  <input type="checkbox" style={{width:24,height:24}} disabled={Boolean(r.existing&&!r.existing.willUpdate)} checked={selected.has(r.wikidata_id)} onChange={e=>{const next=new Set(selected);if(e.target.checked)next.add(r.wikidata_id);else next.delete(r.wikidata_id);setSelected(next);}}/>
 </label>)}</MotionList>
 <Button className="btn-primary" disabled={!selected.size||busy} onClick={()=>setConfirming(true)}>{t('Import selected')}</Button>
 {confirming&&<ConfirmDialog message={t('Import {count} works?',{count:selected.size})} onClose={()=>setConfirming(false)} onConfirm={()=>runCommit(chosen)}/>}
 </>}
 </div>;
}
const PASS_ORDER=['C','E','A','B','D'];
function BulkTab({t,qc}:{t:(k:string,params?:Record<string,string|number>)=>string;qc:ReturnType<typeof useQueryClient>}){
 const progress=useServerFn(importProgress);const batch=useServerFn(importBatch);
 const busy=useRef(false);const stopped=useRef(false);const queued=useRef<ImportCommand[]>([]);const runAll=useRef(false);
 const [error,setError]=useState('');
 const state=useQuery({queryKey:['import-progress'],queryFn:()=>progress(),refetchInterval:3000});
 async function action(pass:string,kind:'start'|'pause'|'resume'|'batch'){
  if(busy.current){if(kind!=='batch')queued.current=queueImportCommand(queued.current,{pass,action:kind});return;}
  busy.current=true;setError('');try{await batch({data:{pass,action:kind}});while(queued.current.length){const command=queued.current.shift();if(command)await batch({data:command});}await qc.invalidateQueries({queryKey:['import-progress']});await qc.invalidateQueries({queryKey:['items']});}catch(e){const m=e instanceof Error?e.message:'';setError(m==='TMDB key required'?t('TMDB key required'):t('Import failed. Please retry.'));}finally{busy.current=false;}
 }
 useEffect(()=>{stopped.current=false;const timer=setInterval(()=>{if(stopped.current||busy.current)return;const running=state.data?.jobs.find((j:any)=>j.status==='running');if(running)void action(running.pass_name,'batch');else if(runAll.current){const next=PASS_ORDER.find(id=>{const j=state.data?.jobs.find((x:any)=>x.pass_name===id);return !j||j.status==='pending'||j.status==='paused';});if(next)void action(next,'start');else runAll.current=false;}},1000);return()=>{stopped.current=true;clearInterval(timer);runAll.current=false;};},[state.data]);
 if(state.error)return <p className="error">{t('Could not load.')}<Button onClick={()=>state.refetch()}>{t('Retry')}</Button></p>;
 if(!state.data)return <Loading/>;
 return <div className="stack">
 {error&&<p className="error" role="alert">{error}</p>}
 <p className="small muted">{t('Administrator access confirmed')} · {t(state.data.tmdbConfigured?'TMDB key saved':'TMDB key required')}</p>
 <Button className="btn-primary" onClick={()=>{runAll.current=true;const next=PASS_ORDER.find(id=>{const j=state.data.jobs.find((x:any)=>x.pass_name===id);return !j||j.status==='pending'||j.status==='paused';});if(next)void action(next,'start');}}>{t('Run all passes in order')}</Button>
 {PASS_ORDER.map(id=>{const pass=PASSES.find(p=>p.id===id)!;const job=state.data.jobs.find((j:any)=>j.pass_name===id);return <div className="box stack" key={id}><h2 className="h2">{id} · {t(pass.label)}</h2><span>{job?.imported_count??0}{pass.target?' / '+pass.target:''} · {t(job?.status??'pending')}</span><span className="small muted">{t('Skipped')}: {job?.skipped_count??0}</span>{job?.last_error&&<p className="error">{job.last_error==='TMDB key required'?t('TMDB key required'):t('Import failed. Please retry.')}</p>}{pass.provider==='tmdb'&&!state.data.tmdbConfigured?<p className="error">{t('TMDB key required')}</p>:<div className="row"><Button disabled={job?.status==='done'||job?.status==='running'} onClick={()=>action(id,job?'resume':'start')}>{t(job?'Resume':'Start')}</Button><Button disabled={job?.status!=='running'} onClick={()=>action(id,'pause')}>{t('Pause')}</Button></div>}</div>;})}
 </div>;
}
