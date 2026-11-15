import { it,expect } from 'vitest';
import { demoFeed } from './demoFeeds';
it('provides empty synthetic feeds in the proposed envelopes',()=>{
 expect(demoFeed('alerts','rs')).toMatchObject({region:{id:'rs'},summary:{active:0,highestSeverity:null},alerts:[]});
 expect(demoFeed('organizations','rs')).toMatchObject({total:0,organizations:[],campaigns:[]});
 expect(demoFeed('posts','rs')).toMatchObject({posts:[],nextCursor:null});
 expect(()=>demoFeed('unknown','rs')).toThrow();
});
