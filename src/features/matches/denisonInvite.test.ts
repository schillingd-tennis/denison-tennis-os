import assert from 'node:assert/strict';
import test from 'node:test';
import {parseTournamentResults} from './tournamentParse';
import {resultDate} from './resultDate';
const names=['Nick Meyers','Mason Conlin','Chika Nwaozuzu','Aidan Borosko','Jackson MacTaggart','Arya Kallambella','Balraj Idnani'];
const roster=names.map((name,i)=>({id:String(i),firstName:name.split(' ')[0]!,lastName:name.split(' ')[1]!,preferredName:null}));
const text=`Friday, September 18 — Singles
1. Nick Meyers (DEN) def. Alejandro González (KEN) 6-4, 7-5
2. Mason Conlin (DEN) def. Stylianos Papamichael (KEN) 6-0, 7-5
3. Chika Nwaozuzu (DEN) def. Jay Dixit (KEN) 6-3, 6-2
4. Aidan Borosko (DEN) def. Sree Kondaveeti (KEN) 6-2, 6-4
5. Jackson MacTaggart (DEN) def. Jonah Ng (KEN) 6-1, 6-3
6. Arya Kallambella (DEN) def. Aditya Shah (KEN) 6-2, 6-4
7. Balraj Idnani (DEN) def. Gianluca Bocanegra (KEN) 6-1, 6-2`;
test('Friday Invite paste resolves all seven players and preserves results',()=>{
 const draft=parseTournamentResults({text,roster,referenceDate:'2026-09-18',seasonYear:2027});
 assert.equal(draft.results.length,7);assert.equal(draft.title,null);assert.deepEqual(draft.flags,[]);
 draft.results.forEach((row,i)=>{assert.equal(row.denisonA.personId,String(i));assert.equal(row.matchDate,'2026-09-18');assert.equal(row.winnerSide,'denison');assert.equal(row.opponentSchool,'Kenyon College');assert.equal(row.scoreSets.length,2);});
 assert.equal(draft.results[0]!.opponentAName,'Alejandro González');
 assert.equal(draft.results[0]!.scoreText,'6-4, 7-5');
});
test('opponent-first winner produces a Denison loss',()=>{
 const draft=parseTournamentResults({text:'Alejandro González (KEN) def. Nick Meyers (DEN) 6-4, 7-5',roster});
 assert.equal(draft.results[0]!.winnerSide,'opponent');assert.equal(draft.results[0]!.denisonA.personId,'0');assert.equal(draft.results[0]!.opponentAName,'Alejandro González');
});
test('day headers update match date without using the current year',()=>{
 const draft=parseTournamentResults({text:text+'\nSaturday, September 19 — Singles\nNick Meyers (DEN) lost to Jay Dixit (KEN) 6-4, 7-5',roster,referenceDate:'2026-09-18'});
 assert.equal(draft.results[7]!.matchDate,'2026-09-19');assert.equal(draft.results[7]!.winnerSide,'opponent');
 assert.equal(resultDate('February 30, 2026'),null);assert.equal(resultDate('September 18'),null);
});
