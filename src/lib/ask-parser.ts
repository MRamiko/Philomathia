import { ASK_MOODS } from './config';
import { ka } from './strings';
export function rulesParse(text:string){
 const value=text.toLowerCase();
 const minutes=value.match(/(\d{1,3})\s*[-–]?\s*(?:min|minute|წუთ)/);
 const media_type=/film|movie|watch|ფილმ|ვუყურ/.test(value)?'film':/book|novel|read|წიგნ|წავიკითხ/.test(value)?'book':'either';
 const moods=Object.keys(ASK_MOODS).filter(m=>value.includes(m)||(ka[m]&&value.includes(ka[m])));
 const words=['thriller','mystery','comedy','romance','drama','science fiction','fantasy','war','poetry','magical realism','horror','animation'];
 const keywords=words.filter(w=>value.includes(w)||(ka[w]&&value.includes(ka[w])));
 return {media_type:media_type as 'film'|'book'|'either',max_minutes:minutes?Number(minutes[1]):null,moods,keywords,georgian_only:/georgia|ქართ/.test(value)};
}
