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
const { FacetedClassification } = require('immfacet');

const data = Immutable.fromJS([
  {
    name: 'Diz',
    instrument: 'saxophone',
    sessions: ['a', 'b', 'c']
  },
  {
    name: 'Bird',
    instrument: 'trumpet',
    sessions: ['a', 'b', 'c']
  },
  {
    name: 'Buddy',
    instrument: 'drums',
    sessions: ['c']
  },
  {
    name: 'Monk',
    instrument: 'piano',
    sessions: ['c']
  }
]);

const fc = new FacetedClassification(data);
```

## Simple faceting based on fields
```js
fc
  .addFieldFacet('sessions')
  .facets()
/* =>
Immutable.Map({
  sessions: {
    'a': Immutable.Set([
      Immutable.Map({ name: 'Diz', ... }),
      Immutable.Map({ name: 'Bird', ... }),
    ]),

    'b': Immutable.Set([
      Immutable.Map({ name: 'Diz', ... }),
      Immutable.Map({ name: 'Bird', ... }),
    ]),

    'c': Immutable.Set([
      Immutable.Map({ name: 'Diz', ... }),
      Immutable.Map({ name: 'Bird', ... }),
      Immutable.Map({ name: 'Buddy', ... }),
      Immutable.Map({ name: 'Monk', ... }),
    ])
  }
})
*/
```

## Arbitrary faceting functions
```js
const windInstruments = ['saxophone', 'trumpet', 'flute', 'tuba']

fc
  .addFacet('playsWindInstrument', person =>
    windInstruments.indexOf(person.get('instrument') !== -1)
  .facets()
  .get('playsWindInstrument')
/* =>
Immutable.Map({
  true: Immutable.Set([
    Immutable.Map({ name: 'Diz', ... }),
    Immutable.Map({ name: 'Bird', ... }),
  ]),

  false: Immutable.Set([
    Immutable.Map({ name: 'Buddy', ... }),
    Immutable.Map({ name: 'Monk', ... }),
  ])
})
*/
// => { 'true': [1, 2], 'false': [3, 4] }
```

# Faceted Classification API
## const fc = new FacetedClassification(dataset);
Create a new faceted classification. Dataset must be an instance of an
Immutable.Iterable, and every object must be an Immutable.Map with an `idField`
key present.

## Creating new facet collections
### fc.addFacet(facetName, classifyingFn, opts={ multiValue: false })
Create a new facet collection which will have a facet field with name
`facetName` whose values will be determined by running `classifyingFn`
against every item in the dataset. If multiValue is set to `true`, results
will be treated as iterables, with each value in the iterable a facet value.

### fc.addFieldFacet(field, opts={})
Shortcut for adding a new facet based on a field name in the item. Takes
the same opts as `addFacet`.

### fc.removeFacet(facetName)
Remove facet with name `facetName` if it exists.

## Retrieving data
### fc.facets()
Get the values of each facet field, along with the items they are present in.


# Faceted Query API
## const fq = new FacetedQuery(fc)
Create a new faceted query based off a FacetedClassification.

## Creating new facet queries
### fq.select({ facetName, values })
Create a new facet collection whose results must match the given `values` for
the facet `facetFieldName`. Will throw an error if `facetFieldName` is not an
initialized facet field.

### fq.deselect({ facetName, values })
The inverse of `fq.select`. If there is no applied filter that matches the
parameters *exactly* (after values has been converted to an Immutable sequence),
then an identical facet collection will be returned.

### fq.reset(facetName?)
If passed a field name, clear any selections that have been set for that facet
field. If not passed a field name, clear all selections for all facets.


## Retrieving data
### fq.selectedFacets()
Get the values of each facet field, along with the items they are present in
after all selections have been applied. Without any selections, this will
return the same value as `fc.facets()` for the faceted collection that `fq`
is based on.

Get the values of each facet field, along with the items they are present in,

### fq.selectedFacetValues()
Get the currently selected facet values for the facet collection (as set with
`fq.select`).

### fq.selectedItems()
Get the items matched by the currently applied selections. Without any
selections, this will return all items.


# License
MIT
