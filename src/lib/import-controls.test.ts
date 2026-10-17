import {expect,it} from 'vitest';
import {queueImportCommand} from './import-controls';
it('retains starts for other passes while a batch is busy',()=>{expect(queueImportCommand([{pass:'C',action:'start'}],{pass:'D',action:'start'})).toEqual([{pass:'C',action:'start'},{pass:'D',action:'start'}]);});
it('keeps a requested pause instead of an earlier resume for the same pass',()=>{expect(queueImportCommand([{pass:'A',action:'resume'}],{pass:'A',action:'pause'})).toEqual([{pass:'A',action:'pause'}]);});