export function imageUrl(item: { image_source: string | null; image_ref: string | null }, size: 'sm' | 'lg'): string | null {
  const ref=item.image_ref;
  if(!ref)return null;
  if(item.image_source==='tmdb' && /^\/[a-zA-Z0-9._-]+$/.test(ref))return `https://image.tmdb.org/t/p/${size==='sm'?'w342':'w500'}${ref}`;
  if(item.image_source==='openlibrary' && /^\d+$/.test(ref))return `https://covers.openlibrary.org/b/id/${ref}-${size==='sm'?'M':'L'}.jpg`;
  if(item.image_source==='googlebooks') { try { const u=new URL(ref); return u.protocol==='https:' && ['books.google.com','books.googleusercontent.com'].includes(u.hostname)?u.href:null; } catch {return null;} }
  return null;
}