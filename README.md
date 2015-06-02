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

# API
## var facets = immfacet(dataset, idField='id');
Create a new faceted collection. Dataset must be an instance of an
Immutable.Iterable, and every object must be an Immutable.Map with an `idField`
key present.

## Creating new facet objects
### facets.addFacet(facetName, classifyingFn, opts={})
Create a new facet collection which will have a facet field with name
`facetName` whose values will be determined by running `classifyingFn`
against every item in the dataset. If `classifyingFn` returns an Array or an
instance of an Immutable.Iterable, all of its iterable results will be taken
as individual facet values.

Takes the following options:
  * singleValue: Override the default behavior, and treat values returned from
    `classifyingFn` as single values.

### facets.addFieldFacet(field, opts={})
Shortcut for adding a new facet based on a field name in the document. Takes
the same opts as `addFacet`.

### facets.select(facetFieldName, values)
Create a new facet collection whose results must match the given `values` for
the facet `facetFieldName`. Will throw an error if `facetFieldName` is not an
initialized facet field.

### facets.deselect(facetFieldName, values)
The inverse of `facets.select`. If there is no applied filter that matches the
parameters *exactly* (after values has been converted to an Immutable sequence),
then an identical facet collection will be returned.

### facets.reset(facetFieldName?)
If passed a field name, clear any selections that have been set for that facet
field. If not passed a field name, clear all selections for all facets.


## Retrieving data
### facets.getFacetValues(opts={})
Get the values of each facet field, along with the items they are present in.
Items are presented as IDs. The following options can be specified

  * `fields`: Limit results to given facet fields
  * `ids`: Limit results to given item IDs

### facets.getSelectedFacetValues()
Get the currently selected facet values for the facet collection (as set with
`facets.select`).

### facets.getMatchedIDs()
Get the document IDs matched by the currently applied constraints.

### facets.getMatchedDocuments()
Get the full documents matched by the currently applied constraints.

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
