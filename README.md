# Immfacet
Simple faceting library for Immutable.js collections on the server or in the browser

# Example
```js
var immfacet = require('immfacet');

var facets = immfacet(Immutable.fromJS([
  {
    id: 1,
    name: 'Diz',
    instrument: 'saxophone',
    sessions: ['a', 'b', 'c']
  },
  {
    id: 2,
    name: 'Bird',
    instrument: 'trumpet',
    sessions: ['a', 'b', 'c']
  },
  {
    id: 3,
    name: 'Buddy',
    instrument: 'drums',
    sessions: ['c']
  },
  {
    id: 4,
    name: 'Monk',
    instrument: 'piano',
    sessions: ['c']
  }
]);

// Simple field faceting
facets.addFieldFacet('sessions');
facet.results().toJS();
// => { sessions: { 'a': [1, 2, 3, 4], 'b': [1, 2, 3, 4], 'c': [1, 2] } }

// Arbitrary faceting functions
var windInstruments = ['saxophone', 'trumpet', 'flute', 'tuba'];
facets.addFacet('playsWindInstrument', function (person) {
  return windInstruments.indexOf(person.instrument) !== -1;
});

facet.results({ fields: ['playsWindInstrument'] }).toJS();
// => { playsWindInstrument: { 'true': [1, 2], 'false': [3, 4] } }
```

# License
MIT
