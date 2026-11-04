/* The fixed Examples menu. Occurrence IDs identify a source turn, never just its text. */
(function (root) {
'use strict';
const QUICK = [
  'Draw a small pink star next to Done',
  'Make the green circle bigger',
  'Connect Done to Start with a dotted line',
  'Is there a path from Start to Done?',
  'What is connected to Check?',
  'Add three tiny red circles in a row below Process',
  'Which shape has the most connections?',
  'From now on, circles are orange',
  'Check is above Process',
  'Rename Done to End',
  'Arrange everything in a circle',
  'Describe the diagram',
  '@g1 command action=create shape=star color=gold name=Gem position=center'
];
const scenarios = typeof module !== 'undefined' ? require('./scenarios.js') : SCENARIOS;
const catalog = () => QUICK.map((text, i) => ({ id: `quick:${i}`, title: `Quick example ${i}`, turns: [text] }))
  .concat(scenarios.map(s => ({ id: `${s.kind === 'scene' ? 'scene' : 'scenario'}:${s.id}`, title: s.title, turns: s.turns.slice() })));
const api = { QUICK: Object.freeze(QUICK), catalog };
if (typeof module !== 'undefined') module.exports = api; else root.ExamplesKit = api;
})(typeof window !== 'undefined' ? window : this);
