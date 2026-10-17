import {it,expect} from 'vitest';
import {moodsFor,validIsbn,normalizeTitle,LANGUAGES,SUBJECTS} from './import-rules';
import {MOOD_TAGS} from './config';
it('assigns 3 to 5 allowed rule moods',()=>{for(const tags of [['science fiction','memory'],['unknown'],['crime','winter']]){const moods=moodsFor(tags);expect(moods.length).toBeGreaterThanOrEqual(3);expect(moods.length).toBeLessThanOrEqual(5);expect(moods.every(m=>MOOD_TAGS.includes(m))).toBe(true);}});
it('only accepts checksum-verified ISBNs',()=>{expect(validIsbn('978-0-306-40615-7')).toBe('9780306406157');expect(validIsbn('9780306406158')).toBeNull();expect(validIsbn('0-306-40615-2')).toBe('0306406152');expect(validIsbn('fake')).toBeNull();});
it('normalizes identity accents punctuation and case',()=>{expect(normalizeTitle('Amélie!')).toBe(normalizeTitle('amelie'));});
it('keeps all requested passes',()=>{expect(LANGUAGES).toHaveLength(23);expect(SUBJECTS).toHaveLength(21);});