import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { watchProviders } from '@/lib/watch.functions';
import { WATCH_REGIONS, REGION_NAMES } from '@/lib/watch-regions';
import { useLocale } from '@/lib/locale';
import { Button } from './auth-form';
import {useEffect,useState} from 'react';
export function WhereToWatch({itemId}:{itemId:string}){
 const {t}=useLocale();
 const [region,setRegion]=useState<string|undefined>(undefined);
 const get=useServerFn(watchProviders);const query=useQuery({queryKey:['watch',itemId,region??'auto'],staleTime:7*86400000,queryFn:()=>get({data:{itemId,...(region?{region}:{})}}),retry:false});
 const [slow,setSlow]=useState(false);useEffect(()=>{setSlow(false);if(!query.isPending)return;const timer=window.setTimeout(()=>setSlow(true),8000);return()=>clearTimeout(timer);},[query.isPending,itemId,region]);
 const providers=query.data?.providers as {stream?:string[];rent?:string[];buy?:string[]}|undefined;
 const shown=query.data?.region as string|undefined;
 const country=t(REGION_NAMES[shown??'GE']??shown??'');
 const none=!providers||![...(providers.stream??[]),...(providers.rent??[]),...(providers.buy??[])].length;
 return <section className="stack"><div className="between"><h2 className="h2">{t('Where to watch')}</h2>
  <label className="small muted">{t('Region')} <select className="input region-select" aria-label={t('Region')} value={region??shown??'GE'} onChange={e=>setRegion(e.target.value)}>{WATCH_REGIONS.map(r=><option key={r} value={r}>{t(REGION_NAMES[r]!)}</option>)}</select></label></div>
  {query.error||slow&&query.isPending?<p role="alert" className="error">{t('Could not check streaming options.')}<Button onClick={()=>{setSlow(false);void query.refetch();}}>{t('Retry')}</Button></p>:query.isPending?<div className="loading-surface" role="status" aria-label={t('Checking streaming options')}/>:<>
  {query.data?.fallback&&!none&&<p className="small" data-testid="wtw-fallback">{t('No options in Georgia. Showing {country} instead.',{country})}</p>}
  {none?<p className="muted small">{t('No streaming options found in {country}.',{country})}</p>:<p className="small muted">{t('Options in {country}',{country})}</p>}
  {!none&&Object.entries(providers!).map(([kind,names])=>names.length?<div className="stack" key={kind}><strong className="small">{t(kind==='stream'?'Stream':kind==='rent'?'Rent':'Buy')}</strong><div className="row">{names.map(name=><span className="chip" key={name}>{name}</span>)}</div></div>:null)}
  {query.data?.link&&<a href={query.data.link} target="_blank" rel="noreferrer">{t('View on JustWatch')}</a>}</>}
  <p className="small muted">{t('Streaming data by JustWatch.')}</p></section>;
}
