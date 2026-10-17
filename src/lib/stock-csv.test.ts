import {describe,it,expect} from 'vitest';
import {parseStockCsv,isbn13,STOCK_TEMPLATE} from './stock-csv';
describe('isbn13',()=>{
 it('converts a valid ISBN-10 to ISBN-13',()=>{expect(isbn13('0-306-40615-2')).toBe('9780306406157');});
 it('accepts a valid ISBN-13 with hyphens',()=>{expect(isbn13('978-0-306-40615-7')).toBe('9780306406157');});
 it('rejects a bad check digit',()=>{expect(isbn13('9780306406158')).toBeNull();});
 it('rejects garbage',()=>{expect(isbn13('abc')).toBeNull();});
});
describe('parseStockCsv',()=>{
 it('parses the template',()=>{const r=parseStockCsv(STOCK_TEMPLATE);expect(r.error).toBeUndefined();expect(r.rows).toHaveLength(1);});
 it('handles a UTF-8 BOM and semicolons',()=>{const r=parseStockCsv('﻿isbn;price_gel;quantity\n9780306406157;24.00;2');expect(r.rows[0]!.status).toBe('valid');expect(r.rows[0]!.row.price).toBe(24);});
 it('is case-insensitive about headers',()=>{const r=parseStockCsv('ISBN,Price_Gel,QUANTITY\n9780306406157,10,1');expect(r.rows[0]!.status).toBe('valid');});
 it('keeps Georgian text in title and author',()=>{const r=parseStockCsv('isbn,price_gel,quantity,title,author\n9780306406157,10,1,მზის ჩასვლა,ნოდარ დუმბაძე');expect(r.rows[0]!.row.title).toBe('მზის ჩასვლა');});
 it('flags a bad ISBN',()=>{const r=parseStockCsv('isbn,price_gel,quantity\n123,10,1');expect(r.rows[0]!.status).toBe('error');expect(r.rows[0]!.reason).toBe('invalid ISBN');});
 it('flags a bad price and a bad quantity',()=>{const r=parseStockCsv('isbn,price_gel,quantity\n9780306406157,-5,1\n9780306406157,10,1.5');expect(r.rows[0]!.reason).toBe('invalid price');expect(r.rows[1]!.reason).toBe('invalid quantity');});
 it('lets the last duplicate ISBN row win',()=>{const r=parseStockCsv('isbn,price_gel,quantity\n9780306406157,10,1\n9780306406157,20,2');expect(r.rows[0]!.duplicate).toBe(true);expect(r.rows[1]!.duplicate).toBeUndefined();expect(r.rows[1]!.row.price).toBe(20);});
 it('rejects a file over the row limit',()=>{const body=Array.from({length:1001},()=>'9780306406157,10,1').join('\n');expect(parseStockCsv('isbn,price_gel,quantity\n'+body).error).toBe('too many rows');});
 it('rejects a file with missing columns',()=>{expect(parseStockCsv('isbn,price\n9780306406157,10').error).toBe('missing columns');});
});
