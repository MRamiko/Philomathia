import {it,expect} from 'vitest';
import {rulesParse} from './ask-parser';
it('understands Georgian film runtime without inventing moods',()=>{const r=rulesParse('90 წუთიანი ფილმი, თრილერი');expect(r.media_type).toBe('film');expect(r.max_minutes).toBe(90);expect(r.keywords).toContain('thriller');expect(r.moods).toEqual([]);});
it('Georgian language and Georgian-only filter are independent',()=>{expect(rulesParse('მშვიდი წიგნი').georgian_only).toBe(false);expect(rulesParse('ქართული წიგნი').georgian_only).toBe(true);});
