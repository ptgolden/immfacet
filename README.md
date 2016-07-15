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
const immfacet = require('immfacet');

const data = Immutable.fromJS([
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

let facetSet = immfacet(data);

// Simple field faceting
facetSet
  .addFieldFacet('sessions')
  .facets
  .toJS()
// => { sessions: { 'a': [1, 2, 3, 4], 'b': [1, 2, 3, 4], 'c': [1, 2] } }


// Arbitrary faceting functions
const windInstruments = ['saxophone', 'trumpet', 'flute', 'tuba']

facetSet
  .addFacet('playsWindInstrument', person =>
    windInstruments.indexOf(person.instrument) !== -1)
  .facets
  .get('playsWindInstrument')
// => { 'true': [1, 2], 'false': [3, 4] }
```

# API
## const facetSet = immfacet(dataset, idField='id');
Create a new faceted collection. Dataset must be an instance of an
Immutable.Iterable, and every object must be an Immutable.Map with an `idField`
key present.

## Creating new facet collections
### facetSet.addFacet(facetName, classifyingFn, opts={ multiValue: false })
Create a new facet collection which will have a facet field with name
`facetName` whose values will be determined by running `classifyingFn`
against every item in the dataset. If multiValue is set to `true`, results
will be treated as iterables, with each value in the iterable a facet value.

### facetSet.addFieldFacet(field, opts={})
Shortcut for adding a new facet based on a field name in the item. Takes
the same opts as `addFacet`.

### facetSet.removeFacet(facetName)
Remove facet with name `facetName` if it exists.

### facetSet.addSelection(facetFieldName, values)
Create a new facet collection whose results must match the given `values` for
the facet `facetFieldName`. Will throw an error if `facetFieldName` is not an
initialized facet field.

### facetSet.removeSelection(facetFieldName, values)
The inverse of `facetSet.select`. If there is no applied filter that matches the
parameters *exactly* (after values has been converted to an Immutable sequence),
then an identical facet collection will be returned.

### facetSet.resetSelections(facetFieldName?)
If passed a field name, clear any selections that have been set for that facet
field. If not passed a field name, clear all selections for all facets.


## Retrieving data
### facetSet.facets
Get the values of each facet field, along with the items they are present in.
Items are presented as IDs.

### facetSet.facetsAfterSelection(opts={ fields: null, ids: null })
Get the values of each facet field, along with the items they are present in,
after all selections have been applied. Identical to `facetSet.facets` when no
selections exist.

The following options can be specified
  * `fields`: Limit results to given facet fields
  * `ids`: Limit results to given item IDs

### facetSet.facetValuesAfterSelection(opts={ fields: null, ids: null })
Get the currently selected facet values for the facet collection (as set with
`facetSet.select`).

### facetSet.selectedIDs()
Get the item IDs matched by the currently applied constraints.

### facetSet.selectedItems()
Get the full items matched by the currently applied constraints.


# License
MIT
