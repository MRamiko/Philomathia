import { describe,it,expect } from 'vitest';
import { en,translate,formatPrice } from './strings';
import {titleOf,descOf} from './data';
import type {Item} from './recommend';
describe('English interface and catalog metadata',()=>{
 it('formats prices in GEL',()=>{expect(formatPrice(24)).toBe('24 GEL');});
 it('preserves Georgian-only catalog descriptions without translating them',()=>{const i={title_en:'Real title',title_ka:'ქართული',description_en:'',description_ka:'ქართული აღწერა'} as Item;expect(titleOf(i,'en')).toBe('Real title');expect(descOf(i,'en')).toBe('ქართული აღწერა');});
});
