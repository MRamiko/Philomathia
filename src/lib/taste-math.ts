export const decayedEvidence=(value:number,swipes:number)=>value*Math.pow(0.5,swipes/40);
export function traitStance(exposures:number,likes:number,baseline:number){
 if(exposures<3)return 'exploring';const difference=(likes+4*baseline)/(exposures+4)-baseline;
 return difference>=0.2?'loves':difference>=0.06?'leans_toward':difference<=-0.2?'avoids':difference<=-0.06?'leans_away':'neutral';
}
export const traitConfidence=(exposures:number)=>exposures<3?'exploring':exposures<6?'emerging':exposures<15?'established':'strong';
export const isDefining=(stance:string,genres:string[])=>['loves','leans_toward'].includes(stance)&&new Set(genres).size>=3;