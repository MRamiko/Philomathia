import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { watchProviders } from '@/lib/watch.functions';
import { Button } from './auth-form';
export function WhereToWatch({itemId}:{itemId:string}){
 const get=useServerFn(watchProviders);const query=useQuery({queryKey:['watch',itemId],staleTime:7*86400000,queryFn:()=>get({data:{itemId}}),retry:false});
 const providers=query.data?.providers as {stream?:string[];rent?:string[];buy?:string[]}|undefined;
 return <section className="stack"><h2 className="h2">Where to watch</h2>{query.isPending?<div className="loading-surface" role="status" aria-label="Checking streaming options"/>:query.error?<p role="alert" className="error">Could not check streaming options.<Button onClick={()=>query.refetch()}>Retry</Button></p>:<>{!providers||![...(providers.stream??[]),...(providers.rent??[]),...(providers.buy??[])].length?<p className="muted small">No streaming options found in Georgia.</p>:Object.entries(providers).map(([kind,names])=>names.length?<div className="stack" key={kind}><strong className="small">{kind==='stream'?'Stream':kind==='rent'?'Rent':'Buy'}</strong><div className="row">{names.map(name=><span className="chip" key={name}>{name}</span>)}</div></div>:null)}{query.data?.link&&<a href={query.data.link} target="_blank" rel="noreferrer">View on JustWatch</a>}</>}<p className="small muted">Streaming data by JustWatch.</p></section>;
}