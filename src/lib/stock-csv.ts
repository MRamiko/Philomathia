import {validIsbn} from './import-rules';
export type StockRow={isbn:string;price:number;quantity:number;title?:string;author?:string};
export type ParsedRow={row:StockRow;status:'valid'|'error';reason?:string;duplicate?:boolean};
export function isbn13(raw:string):string|null{
 const s=raw.replace(/[\s-]/g,'').toUpperCase();
 if(/^\d{9}[\dX]$/.test(s)&&validIsbn(s)){
  const base='978'+s.slice(0,9);let sum=0;for(let i=0;i<12;i++)sum+=Number(base[i])*(i%2?3:1);
  const check=(10-(sum%10))%10;return validIsbn(base+check);
 }
 if(/^\d{13}$/.test(s))return validIsbn(s);
 return null;
}
export function parseStockCsv(text:string,maxRows=1000):{rows:ParsedRow[];error?:string}{
 const clean=text.replace(/^﻿/,'');
 const lines=clean.split(/\r?\n/).filter(l=>l.trim());
 if(!lines.length)return {rows:[],error:'empty'};
 const delim=(lines[0].match(/;/g)?.length??0)>(lines[0].match(/,/g)?.length??0)?';':',';
 const split=(line:string)=>{const out:string[]=[];let cur='';let quoted=false;for(const ch of line){if(ch==='"'){quoted=!quoted;continue;}if(ch===delim&&!quoted){out.push(cur.trim());cur='';continue;}cur+=ch;}out.push(cur.trim());return out;};
 const headers=split(lines[0]).map(h=>h.toLowerCase());
 const col=(name:string)=>headers.indexOf(name);
 const ci=col('isbn'),cp=col('price_gel'),cq=col('quantity'),ct=col('title'),ca=col('author');
 if(ci<0||cp<0||cq<0)return {rows:[],error:'missing columns'};
 const data=lines.slice(1);
 if(data.length>maxRows)return {rows:[],error:'too many rows'};
 const seen=new Map<string,number>();
 const rows:ParsedRow[]=data.map(line=>{
  const c=split(line);
  const isbn=isbn13(c[ci]??'');
  const price=Number(c[cp]);
  const quantity=Number(c[cq]);
  const row:StockRow={isbn:isbn??(c[ci]??''),price,quantity,title:ct>=0?c[ct]:undefined,author:ca>=0?c[ca]:undefined};
  if(!isbn)return {row,status:'error',reason:'invalid ISBN'};
  if(!(price>0)||!/^\d+(\.\d{1,2})?$/.test(c[cp]??''))return {row,status:'error',reason:'invalid price'};
  if(!Number.isInteger(quantity)||quantity<0)return {row,status:'error',reason:'invalid quantity'};
  const dup=seen.has(isbn);seen.set(isbn,1);
  return {row,status:'valid',duplicate:dup};
 });
 // Last row wins for duplicate ISBNs: mark earlier duplicates as skipped.
 const lastIndex=new Map<string,number>();rows.forEach((r,i)=>{if(r.status==='valid')lastIndex.set(r.row.isbn,i);});
 rows.forEach((r,i)=>{if(r.status==='valid'&&r.duplicate===undefined&&lastIndex.get(r.row.isbn)!==i){r.duplicate=true;}});
 return {rows};
}
export const STOCK_TEMPLATE='isbn,price_gel,quantity,title,author\n9789941031299,24.00,3,Example title,Example author\n';
