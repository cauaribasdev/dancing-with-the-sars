import {expect,it} from 'vitest';
import {mergeImageSelection} from './imageSelection';
it('adds other days without losing selected images and deduplicates',()=>{expect(mergeImageSelection(['a','b'],['b','c'],['a','b','c'])).toEqual(['a','b','c']);});
it('rejects stale IDs outside the current region/period',()=>{expect(mergeImageSelection(['old','a'],['other','b'],['a','b'])).toEqual(['a','b']);});
it('never mutates inputs and keeps deterministic order',()=>{const a=['b'];expect(mergeImageSelection(a,['a'],['a','b'])).toEqual(['a','b']);expect(a).toEqual(['b']);});
