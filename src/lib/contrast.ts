export function contrastRatio(a:number[],b:number[]){const luminance=(c:number[])=>c.map(v=>{const s=v/255;return s<=0.04045?s/12.92:Math.pow((s+0.055)/1.055,2.4);}).reduce((sum,v,n)=>sum+v*([0.2126,0.7152,0.0722][n]??0),0);const x=luminance(a),y=luminance(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);}
export function checkThemeContrast(){
 if(!import.meta.env.DEV)return;
 const root=getComputedStyle(document.documentElement);const color=(token:string)=>{const canvas=document.createElement('canvas');const ctx=canvas.getContext('2d');if(!ctx)return [0,0,0];ctx.fillStyle=root.getPropertyValue(token).trim();ctx.fillRect(0,0,1,1);return Array.from(ctx.getImageData(0,0,1,1).data).slice(0,3);};
 const pairs:[string,string,number][]=[['--text-primary','--background',4.5],['--text-secondary','--surface-2',4.5],['--text-tertiary','--surface-2',4.5],['--on-accent','--accent',4.5],['--border-subtle','--surface-1',3],['--border-strong','--surface-2',3]];
 for(const trait of ['visual','pace','tone','themes','era','origin','form'])pairs.push([`--trait-${trait}`,'--surface-2',4.5]);
 for(const [fg,bg,minimum] of pairs){const ratio=contrastRatio(color(fg),color(bg));if(ratio<minimum)console.warn(`Contrast below ${minimum}: ${fg} on ${bg} (${ratio.toFixed(2)})`);}
}