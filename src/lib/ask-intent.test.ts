import {expect,it} from 'vitest';
import {parseIntent,validateIntent} from './ask-intent';
it('short black-and-white drama becomes hard filters',()=>{const i=parseIntent('a short black-and-white drama film');expect(i.media_type).toBe('film');expect(i.genres).toEqual(['drama']);expect(i.max_minutes).toBe(89);expect(i.traits).toContainEqual({facet:'visual',value:'black_and_white'});});
it('recognizes a similar title without inventing genres',()=>{const i=parseIntent('something like Memento');expect(i.similar_to).toEqual(['Memento']);expect(i.genres).toEqual([]);});
it('romantic comedy stays in comedy and romance',()=>{expect(parseIntent('cozy romantic comedy for tonight').genres).toEqual(['comedy','romance']);});
it('under 90 minutes excludes 90',()=>{expect(parseIntent('film under 90 minutes').max_minutes).toBe(89);});
it('invalid AI trait values are dropped',()=>{expect(validateIntent({traits:[{facet:'visual',value:'invented'}]},'film')?.traits).toEqual([]);});