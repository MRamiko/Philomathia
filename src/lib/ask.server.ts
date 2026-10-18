import {streamText,Output} from 'ai';
import {z} from 'zod';
import {createLovableAiGatewayProvider} from './ai/gateway-helpers.server.ts';
import {FACETS} from './facets';
const schema=z.object({media_type:z.enum(['film','book','either']),genres:z.array(z.string()),keywords:z.array(z.string()),traits:z.array(z.object({facet:z.string(),value:z.string()}).strict()),similar_to:z.array(z.string()),creators:z.array(z.string()),min_year:z.number().nullable(),max_year:z.number().nullable(),max_minutes:z.number().nullable(),max_pages:z.number().nullable(),georgian_only:z.boolean(),excluded_genres:z.array(z.string())}).strict();
export async function parseAiIntent(text:string){
 const key=process.env['LOVABLE_API_KEY'];if(!key)return {raw:null,error:null};
 const provider=createLovableAiGatewayProvider(key,undefined,{baseURL:'https://ai.gateway.lovable.dev/v1'});
 try{const result=streamText({model:provider('google/gemini-3-flash-preview'),instructions:`Parse a film/book request. Explicit constraints only, never infer unrelated genres. Return traits only from ${JSON.stringify(FACETS)}. Black-and-white and short are hard constraints. For similar-to keep the title; do not invent its traits. No result titles. JSON only.`,messages:[{role:'user',content:text}],output:Output.object({schema}),maxRetries:0});return {raw:await result.output,error:null};}
 catch{return {raw:null,error:'AI could not parse this request; using the words you typed.'};}
}