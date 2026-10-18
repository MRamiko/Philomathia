import type { ReactNode } from 'react';
import { translate } from './strings';
export function LocaleProvider({children}:{children:ReactNode}){return children;}
export const useLocale=()=>({lang:'en',t:(key:string,vars?:Record<string,string|number>)=>translate('en',key,vars)});
