import {createFileRoute} from '@tanstack/react-router';
import {useServerFn} from '@tanstack/react-start';
import {useQuery,useQueryClient} from '@tanstack/react-query';
import {useRef,useState} from 'react';
import {Button} from '@/components/auth-form';
import {ConfirmDialog,MotionList} from '@/components/motion';
import {Shell,Loading} from '@/components/phi';
import {useLocale} from '@/lib/locale';
import {useMe} from '@/lib/data';
import {formatPrice} from '@/lib/strings';
import {parseStockCsv,STOCK_TEMPLATE,type ParsedRow} from '@/lib/stock-csv';
import {myShops,matchStockRows,commitStock} from '@/lib/stock.functions';
export const Route=createFileRoute('/_authenticated/shop-stock')({head:()=>({meta:[{title:'Shop stock · Philomathia'},{name:'description',content:'Upload and manage bookshop stock in Philomathia.'},{property:'og:title',content:'Shop stock · Philomathia'},{property:'og:description',content:'Upload and manage bookshop stock.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'}]}),component:ShopStock});
type MatchedRow=ParsedRow&{itemId?:string|null;matchedTitle?:string|null;matchStatus?:string};
function ShopStock(){
 const {t,lang}=useLocale();const me=useMe();const qc=useQueryClient();
 const shopsFn=useServerFn(myShops);const matchFn=useServerFn(matchStockRows);const commitFn=useServerFn(commitStock);
 const shops=useQuery({queryKey:['my-shops'],queryFn:()=>shopsFn(),enabled:Boolean(me.data)});
 const [shopId,setShopId]=useState('');const [rows,setRows]=useState<MatchedRow[]|null>(null);
 const [parseError,setParseError]=useState('');const [zeroMissing,setZeroMissing]=useState(false);
 const [confirming,setConfirming]=useState(false);const [summary,setSummary]=useState<{added:number;updated:number;zeroed:number;failed:{reason:string}[]}|null>(null);
 const [busy,setBusy]=useState(false);const [error,setError]=useState('');const fileRef=useRef<HTMLInputElement>(null);
 if(!me.data)return <Shell><Loading/></Shell>;
 const canManage=(me.data.roles.includes('shop')||me.data.roles.includes('admin'));
 if(!canManage)return <Shell><p className="error">{t('Not allowed.')}</p></Shell>;
 const shop=shops.data?.shops.find(s=>s.id===shopId)??shops.data?.shops[0];
 async function onFile(file:File){
  setParseError('');setError('');setSummary(null);
  if(!file.name.toLowerCase().endsWith('.csv')){setParseError(t('Choose a .csv file.'));return;}
  if(file.size>1024*1024){setParseError(t('The file is over 1MB.'));return;}
  const parsed=parseStockCsv(await file.text());
  if(parsed.error){setParseError(t(parsed.error==='empty'?'The file is empty.':parsed.error==='missing columns'?'The file needs isbn, price_gel and quantity columns.':'The file has over 1,000 rows.'));return;}
  setBusy(true);
  try{
   const valid=parsed.rows.filter(r=>r.status==='valid'&&!r.duplicate);
   const matched=await matchFn({data:{shopId:shop!.id,rows:valid.map(r=>r.row)}});
   const merged:MatchedRow[]=parsed.rows.map(r=>{
    if(r.status==='error')return {...r,matchStatus:'error'};
    if(r.duplicate)return {...r,matchStatus:'duplicate'};
    const m=matched.find(x=>x.isbn===r.row.isbn);
    return {...r,itemId:m?.itemId,matchedTitle:m?.matchedTitle,matchStatus:m?.status??'not_found'};
   });
   setRows(merged);
  }catch{setError(t('Could not load.')+' '+t('Retry'));}finally{setBusy(false);}
 }
 async function commit(){
  if(!rows||!shop)return;setBusy(true);setError('');
  const valid=rows.filter(r=>r.matchStatus==='valid'||r.matchStatus==='will_update');
  try{const s=await commitFn({data:{shopId:shop.id,rows:valid.map(r=>({itemId:r.itemId!,price:r.row.price,quantity:r.row.quantity})),zeroMissing}});setSummary(s);setConfirming(false);await qc.invalidateQueries({queryKey:['shops']});await qc.invalidateQueries({queryKey:['stock']});}
  catch{setError(t('Could not save. Please retry.'));}finally{setBusy(false);}
 }
 function downloadErrors(){
  if(!summary)return;const bad=(rows??[]).filter(r=>r.matchStatus==='error'||r.matchStatus==='not_found');
  const csv='isbn,price_gel,quantity,reason\n'+bad.map(r=>`${r.row.isbn},${r.row.price},${r.row.quantity},${r.reason??r.matchStatus}`).join('\n');
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='stock-errors.csv';a.click();URL.revokeObjectURL(a.href);
 }
 const counts=rows?{valid:rows.filter(r=>r.matchStatus==='valid').length,update:rows.filter(r=>r.matchStatus==='will_update').length,notFound:rows.filter(r=>r.matchStatus==='not_found').length,error:rows.filter(r=>r.matchStatus==='error').length,dup:rows.filter(r=>r.matchStatus==='duplicate').length}:null;
 return <Shell><h1 className="h1">{t('Shop stock')}</h1>
 {shops.isPending?<Loading/>:shops.error?<p className="error">{t('Could not load.')}<Button onClick={()=>shops.refetch()}>{t('Retry')}</Button></p>:<>
 {(shops.data?.shops.length??0)>1&&<div className="row">{shops.data!.shops.map(s=><button key={s.id} className={`chip ${(shop?.id)===s.id?'chip-active':''}`} onClick={()=>setShopId(s.id)}>{s.name}</button>)}</div>}
 {summary?<div className="box stack"><h2 className="h2">{t('Summary')}</h2>
  <span>{t('Added')}: {summary.added} · {t('Updated')}: {summary.updated} · {t('Set out of stock')}: {summary.zeroed} · {t('Failed')}: {summary.failed.length}</span>
  <div className="row">{rows?.some(r=>r.matchStatus==='error'||r.matchStatus==='not_found')&&<Button onClick={downloadErrors}>{t('Download errors')}</Button>}<Button onClick={()=>{setSummary(null);setRows(null);}}>{t('Upload another file')}</Button></div></div>:<>
 <div className="row">
  <Button disabled={busy} onClick={()=>fileRef.current?.click()}>{t('Choose CSV file')}</Button>
  <input ref={fileRef} type="file" accept=".csv" className="hidden-input" aria-label={t('Choose CSV file')} onChange={e=>{const f=e.target.files?.[0];if(f)void onFile(f);e.target.value='';}}/>
  <button className="linklike" onClick={()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([STOCK_TEMPLATE],{type:'text/csv'}));a.download='stock-template.csv';a.click();URL.revokeObjectURL(a.href);}}>{t('Download template')}</button>
 </div>
 {parseError&&<p className="error" role="alert">{parseError}</p>}
 {error&&<p className="error" role="alert">{error}</p>}
 {busy&&<Loading/>}
 {rows&&counts&&<>
  <p className="small">{t('Valid')}: {counts.valid} · {t('Will update')}: {counts.update} · {t('Not found')}: {counts.notFound} · {t('Error:')} {counts.error}{counts.dup?` · ${t('Duplicate rows')}: ${counts.dup}`:''}</p>
  <MotionList scope="stock-review">{rows.map((r,i)=><div key={i} className="box stack">
   <strong className="clamp2">{r.matchedTitle??r.row.title??r.row.isbn}</strong>
   <span className="muted small">{r.row.isbn} · {formatPrice(r.row.price,lang)} · {t('Quantity')}: {r.row.quantity}</span>
   <span className={`small ${r.matchStatus==='error'||r.matchStatus==='not_found'?'error':''}`}>{r.matchStatus==='valid'?t('Valid'):r.matchStatus==='will_update'?t('Will update'):r.matchStatus==='duplicate'?t('Duplicate rows'):r.matchStatus==='not_found'?t('Not found'):`${t('Error:')} ${t(r.reason==='invalid ISBN'?'Invalid ISBN':r.reason==='invalid price'?'Invalid price':'Invalid quantity')}`}</span>
  </div>)}</MotionList>
  <label className="row small"><input type="checkbox" checked={zeroMissing} onChange={e=>setZeroMissing(e.target.checked)}/>{t('Set books missing from this file to out of stock')}</label>
  <Button className="btn-primary" disabled={busy||!(counts.valid+counts.update)} onClick={()=>setConfirming(true)}>{t('Update stock')}</Button>
  {confirming&&<ConfirmDialog message={t('Update stock for {count} books?',{count:counts.valid+counts.update})} onClose={()=>setConfirming(false)} onConfirm={commit}/>}
 </>}
 </>}
 </>}</Shell>;
}
