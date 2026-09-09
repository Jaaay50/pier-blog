import {describe,expect,it} from 'vitest';
import {appendRaft,createRaft,tickRaft,toggleRaftNode,type RaftState} from './raft';

describe('Raft committed-prefix monotonicity',()=>{
  it('does not retract a follower commit when the new leader missed the previous commit notification',()=>{
    const state=createRaft();
    state.nodes.forEach(node=>{node.term=1;node.timeout=100;});
    state.nodes[0].log=[{term:1,value:'committed'}];state.nodes[0].commit=1;
    state.nodes[1].log=[{term:1,value:'committed'}];state.nodes[1].elapsed=100;
    // Three nodes held the previous majority entry; the old leader is now offline.
    state.nodes[3].log=[{term:1,value:'committed'}];state.nodes[3].commit=1;
    state.nodes[3].alive=false;state.nodes[4].alive=false;
    const next=tickRaft(state);
    expect(next.nodes[1].role).toBe('leader');
    expect(next.nodes[1].commit).toBe(0);
    expect(next.nodes[0].commit).toBe(1);
    expect(next.nodes[0].log[0]).toEqual({term:1,value:'committed'});
    expect(state.nodes[0].log).toHaveLength(1);

    const caughtUp=tickRaft(next);
    expect(caughtUp.nodes.filter(node=>node.alive).every(node=>node.commit===2)).toBe(true);
  });

  it('keeps commit positions and committed values monotonic through deterministic failure and recovery sequences',()=>{
    let seed=424242;
    const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    for(let sample=0;sample<6;sample++){
      let state=createRaft();
      const committed=new Map<number,string>();
      for(let step=0;step<500;step++){
        const previous:RaftState=state,id=Math.floor(random()*5),action=random();
        if(action<.08)state=toggleRaftNode(state,id);
        else if(action<.15)state={...state,groups:state.nodes.map(()=>random()<.5?0:1)};
        else if(action<.2)state={...state,groups:[0,0,0,0,0]};
        else if(action<.3)state=appendRaft(state,id,`sample-${sample}-${step}`);
        else state=tickRaft(state);
        for(const node of state.nodes){
          expect(node.commit).toBeGreaterThanOrEqual(previous.nodes[node.id].commit);
          expect(node.commit).toBeLessThanOrEqual(node.log.length);
          for(let index=0;index<node.commit;index++){
            const entry=JSON.stringify(node.log[index]);
            if(committed.has(index))expect(entry).toBe(committed.get(index));
            committed.set(index,entry);
          }
        }
      }
    }
  });
});
