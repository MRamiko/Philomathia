import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTaste } from '@/lib/taste';
import { useMe } from '@/lib/data';
import { facetLabel } from '@/lib/facets';
import { Button } from './auth-form';
import { Presence } from './motion';
import { Icon } from './icons';
export function TasteCard(){
 const me=useMe();const taste=useTaste();const qc=useQueryClient();const [selected,setSelected]=useState<{facet:string;value:string}|null>(null);const [error,setError]=useState('');
 async function override(stance:'love'|'avoid'|null){if(!selected||!me.data)return;setError('');try{const result=stance?await supabase.from('user_taste_overrides').upsert({user_id:me.data.uid,facet:selected.facet,value:selected.value,stance}):await supabase.from('user_taste_overrides').delete().eq('user_id',me.data.uid).eq('facet',selected.facet).eq('value',selected.value);if(result.error)throw result.error;await qc.invalidateQueries({queryKey:['taste']});window.dispatchEvent(new Event('phi-taste-changed'));setSelected(null);}catch{setError('Could not save your preference. Please retry.');}}
 const groups=[['Defining',(t:any)=>t.defining],['You lean toward',(t:any)=>!t.defining&&['loves','leans_toward'].includes(t.stance)],['You lean away',(t:any)=>['avoids','leans_away'].includes(t.stance)],['Still exploring',(t:any)=>t.stance==='exploring']] as const;
 const count=me.data?.swipes.length??0;
 return <section className="box stack"><h2 className="h2">Your taste</h2><strong>{taste.data?.portrait?.archetype??'The Curious Explorer'}</strong><p>{taste.data?.portrait?.summary??'Your taste is still taking shape. Each choice helps reveal what matters to you.'}</p><span className="small muted">{count<15?'Getting to know you':count<40?'Learning your taste':'Taste tuned'}</span><div className="learning-meter" aria-hidden="true">{[0,15,40].map(n=><span key={n} className={count>=n?'complete':''}/>)}</div>
 {taste.error&&<p className="error">Could not load your taste.<Button onClick={()=>taste.refetch()}>Retry</Button></p>}
 {groups.map(([label,match])=>{const values=taste.data?.traits.filter(match).slice(0,6)??[];return values.length?<div className="stack" key={label}><strong className="small">{label==='Defining'&&<Icon name="spark"/>}{label}</strong><div className="row">{values.map(trait=><Button key={trait.facet+trait.value+trait.media_type} className={`chip trait-chip ${trait.stance==='exploring'?'exploring':''}`} data-facet={trait.facet} onClick={()=>setSelected(trait)}>{facetLabel(trait.value)}</Button>)}</div></div>:null;})}
 {selected&&<Presence historyEntry className="drawer-bg" onExit={()=>setSelected(null)}>{close=><><div className="drawer-dismiss" onClick={close}/><div className="drawer stack" role="dialog" aria-modal="true" aria-label={facetLabel(selected.value)}><div className="between"><h2 className="h2">{facetLabel(selected.value)}</h2><Button className="icon-btn" aria-label="Close" onClick={close}><Icon name="close"/></Button></div><p>{taste.data?.traits.some(t=>t.facet===selected.facet&&t.value===selected.value&&t.defining)?'You liked this trait across at least three genres.':'This pattern comes from your choices among the titles you have been shown.'}</p>{error&&<p className="error">{error}</p>}<Button className="btn-primary" onClick={()=>override('love')}>More of this</Button><Button onClick={()=>override(null)}>Neutral</Button><Button onClick={()=>override('avoid')}>Less of this</Button><Button className="btn-text" onClick={()=>override(null)}>Reset</Button><Link className="btn" to="/discover" search={{tag:undefined,facet:selected.facet,value:selected.value}} onClick={close}>Show me these</Link></div></>}</Presence>}
 </section>;
}