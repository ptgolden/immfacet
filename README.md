# Immfacet
Simple faceting library for Immutable.js collections on the server or in the
browser. Intended for use in applications with small-ish datasets that do not
necessarily need (or cannot run) search engines like [Lucene][], [Solr][],
[ElasticSearch][], etc. If you need to do anything complicated, you should use
one of those.

Other JavaScript faceting libraries are typically coupled with visual components
and DOM event interaction. Immfacet makes no assumptions about the kind of
faceted browsing system you intend to implement.

[Lucene]: <http://lucene.apache.org/core/4_0_0/facet/org/apache/lucene/facet/doc-files/userguide.html>
[Solr]: <https://wiki.apache.org/solr/SimpleFacetParameters>
[ElasticSearch]: <https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations.html>

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
facets = facets.addFieldFacet('sessions');
facets.getFacetValues().toJS();
// => { sessions: { 'a': [1, 2, 3, 4], 'b': [1, 2, 3, 4], 'c': [1, 2] } }

// Arbitrary faceting functions
var windInstruments = ['saxophone', 'trumpet', 'flute', 'tuba'];
facets = facets.addFacet('playsWindInstrument', function (person) {
  return windInstruments.indexOf(person.instrument) !== -1;
});

facets.getFacetValues({ fields: ['playsWindInstrument'] }).toJS();
// => { playsWindInstrument: { 'true': [1, 2], 'false': [3, 4] } }
```

# TODO
  * Range faceting helper functions
  * Support for limiting results
  * Memoization & progressive querying
  * Add/remove documents
  * Asynchronous initialization/querying (?)
  * Abstraction layer for dataset representation (e.g. to replace/remove
    Immutable.js dependency)

# License
MIT
