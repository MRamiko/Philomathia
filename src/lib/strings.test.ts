import { describe,it,expect } from 'vitest';
import { dictionaries,translate,formatPrice } from './strings';
import {titleOf,descOf} from './data';
import type {Item} from './recommend';
describe('localization',()=>{
 it('every dictionary key exists in both languages',()=>{expect(Object.keys(dictionaries.en).sort()).toEqual(Object.keys(dictionaries.ka).sort());for(const key of Object.keys(dictionaries.en))expect(dictionaries.ka[key]?.trim()).toBeTruthy();});
 it('formats Georgian and English prices',()=>{expect(formatPrice(24,'ka')).toBe('24 ₾');expect(formatPrice(24,'en')).toBe('24 GEL');});
 it('translates app language and reverses',()=>{expect(translate('ka','App language')).toBe('აპლიკაციის ენა');expect(translate('en','App language')).toBe('App language');});
 it('blank Georgian metadata falls back field by field',()=>{const i={title_en:'Real title',title_ka:' ',description_en:'Real description',description_ka:'ქართული აღწერა'} as Item;expect(titleOf(i,'ka')).toBe('Real title');expect(descOf(i,'ka')).toBe('ქართული აღწერა');expect(descOf(i,'en')).toBe('Real description');});
});
