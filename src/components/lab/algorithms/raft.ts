export interface LogEntry { term: number; value: string }
export interface RaftNode {
  id: number; alive: boolean; role: 'follower'|'candidate'|'leader'; term: number;
  votedFor: number|null; log: LogEntry[]; commit: number; elapsed: number; timeout: number;
  next: number[]; match: number[];
}
export interface RaftState { nodes: RaftNode[]; groups: number[]; tick: number }
export function createRaft(): RaftState {
  return { tick: 0, groups: [0,0,0,0,0], nodes: Array.from({length:5},(_,id)=>({id,alive:true,role:'follower',term:0,votedFor:null,log:[],commit:0,elapsed:0,timeout:4+id*2,next:[0,0,0,0,0],match:[0,0,0,0,0]})) };
}
function demote(n: RaftNode, term: number) {
  if(term>n.term) { n.term=term; n.votedFor=null; }
  n.role='follower'; n.elapsed=0;
}
const lastTerm=(n:RaftNode)=>n.log.at(-1)?.term??0;
/** 确定性离散网络轮：每轮投递 RequestVote/AppendEntries，不模拟壁钟或真实网络。 */
export function tickRaft(previous: RaftState): RaftState {
  const state: RaftState = structuredClone(previous); state.tick++;
  const connected=(a:RaftNode,b:RaftNode)=>a.alive&&b.alive&&state.groups[a.id]===state.groups[b.id];
  for(const node of state.nodes) {
    if(!node.alive || node.role==='leader') continue;
    node.elapsed++;
    if(node.elapsed<node.timeout) continue;
    node.role='candidate'; node.term++; node.votedFor=node.id; node.elapsed=0;
    node.timeout=4+((node.id*7+node.term*3)%9);
    let votes=1;
    for(const peer of state.nodes) {
      if(peer.id===node.id||!connected(node,peer)) continue;
      if(peer.term>node.term) { demote(node,peer.term); break; }
      if(node.term>peer.term) demote(peer,node.term);
      const upToDate=lastTerm(node)>lastTerm(peer)||(lastTerm(node)===lastTerm(peer)&&node.log.length>=peer.log.length);
      if(upToDate&&(peer.votedFor===null||peer.votedFor===node.id)) { peer.votedFor=node.id; peer.elapsed=0; votes++; }
    }
    if(node.role==='candidate'&&votes>=3) {
      node.role='leader'; node.next=state.nodes.map(()=>node.log.length); node.match=state.nodes.map(()=>0);
      // 当前 term 的 no-op 使前任已复制日志可按 Raft 规则提交。
      node.log.push({term:node.term,value:'∅'}); node.match[node.id]=node.log.length;
    }
  }
  for(const leader of state.nodes) {
    if(!leader.alive||leader.role!=='leader') continue;
    leader.match[leader.id]=leader.log.length;
    for(const follower of state.nodes) {
      if(follower.id===leader.id||!connected(leader,follower)) continue;
      if(follower.term>leader.term) { demote(leader,follower.term); break; }
      demote(follower,leader.term);
      const next=Math.min(leader.next[follower.id],leader.log.length);
      if(next>follower.log.length||(next>0&&follower.log[next-1].term!==leader.log[next-1].term)) {
        leader.next[follower.id]=Math.max(0,next-1); continue;
      }
      let index=next;
      while(index<leader.log.length) {
        if(follower.log[index]&&follower.log[index].term!==leader.log[index].term) follower.log.splice(index);
        if(!follower.log[index]) follower.log.push({...leader.log[index]});
        index++;
      }
      leader.next[follower.id]=index; leader.match[follower.id]=index;
      // 新 leader 可能尚未收到前任的提交通知；已经提交的位置只能前进。
      follower.commit=Math.max(follower.commit,Math.min(leader.commit,index));
    }
    if(leader.role!=='leader') continue;
    for(let index=leader.log.length;index>leader.commit;index--) {
      if(leader.log[index-1].term===leader.term&&leader.match.filter(m=>m>=index).length>=3) { leader.commit=index; break; }
    }
    for(const follower of state.nodes) if(follower.id!==leader.id&&connected(leader,follower)) follower.commit=Math.max(follower.commit,Math.min(leader.commit,leader.match[follower.id]));
  }
  return state;
}
export function appendRaft(previous: RaftState, nodeId:number, value:string): RaftState {
  const state:RaftState=structuredClone(previous), node=state.nodes[nodeId];
  if(node?.alive&&node.role==='leader'&&value.trim()&&node.log.length<48) node.log.push({term:node.term,value:value.trim().slice(0,24)});
  return state;
}
export function toggleRaftNode(previous:RaftState,id:number):RaftState {
  const state:RaftState=structuredClone(previous),n=state.nodes[id];
  if(n) { n.alive=!n.alive; n.role='follower'; n.elapsed=0; }
  return state;
}
