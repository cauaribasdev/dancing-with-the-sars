import {expect,it} from 'vitest';
import {orderComposition} from './compositionOrder';
it('orders oldest first so newest draws last, ignoring unknown IDs and duplicates',()=>{
 const passes=[{id:'z',start:'2026-07-01T00:00:00Z'},{id:'a',start:'2026-07-03T00:00:00Z'},{id:'b',start:'2026-07-03T00:00:00Z'}];
 const ids=['b','missing','z','a','z'];
 expect(orderComposition(ids,passes)).toEqual(['z','a','b']);
 expect(ids).toEqual(['b','missing','z','a','z']);
 expect(passes[0].id).toBe('z');
});
it('handles empty selection',()=>expect(orderComposition([],[])).toEqual([]));
