import {it,expect} from 'vitest';
import {contrastRatio} from './contrast';
it('black and white produce the WCAG 21:1 ratio',()=>expect(contrastRatio([0,0,0],[255,255,255])).toBe(21));
it('identical colors cannot pass the text threshold',()=>expect(contrastRatio([80,80,80],[80,80,80])).toBe(1));