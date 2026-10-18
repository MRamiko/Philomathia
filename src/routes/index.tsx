import { createFileRoute, redirect } from '@tanstack/react-router';
import { rememberedTab } from '@/lib/pwa';
export const Route=createFileRoute('/')({
 head:()=>({meta:[{title:'Philomathia · Film and book diary'},{name:'description',content:'Discover films and books and keep your bilingual diary.'},{property:'og:title',content:'Philomathia · Film and book diary'},{property:'og:description',content:'Discover films and books and keep your bilingual diary.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary'}]}),
 beforeLoad:()=>{ const saved=typeof window==='undefined'?null:rememberedTab();const to=saved==='/search'?'/search':saved==='/library'?'/library':saved==='/ask'?'/ask':saved==='/profile'?'/profile':'/discover';throw redirect({to}); }
});
