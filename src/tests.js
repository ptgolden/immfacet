"use strict";

const test = require('tape')
    , Immutable = require('immutable')
    , { FacetedClassification, FacetedQuery } = require('./')


const sampleData = Immutable.fromJS([
  { type: 'blargh', things: ['a', 'b'] },
  { type: 'ugh', things: ['b', 'c'] },
  { type: 'ugh', things: [] }
])


const nestedData = Immutable.fromJS([
  { person: { name: 'Diz', favorite_things: ['lemonade']  }},
  { person: { name: 'Grizz', favorite_things: ['lemonade', 'lollipops']}},
  { person: { name: 'Liz', favorite_things: ['ice']}}
])


test('Faceted classification', t => {
  t.plan(5);

  const fc = new FacetedClassification(sampleData)

  const fc1 = fc
    .addFieldFacet(['type'])
    .addFieldFacet('things', { multiValue: true })

  t.ok(fc1.facetsByIndex().equals(
    Immutable.Map({
      type: Immutable.Map({
        'blargh': Immutable.Set([0]),
        'ugh': Immutable.Set([1, 2]),
      }),
      things: Immutable.Map({
        'a': Immutable.Set([0]),
        'b': Immutable.Set([0, 1]),
        'c': Immutable.Set([1])
      })
    })
  ), 'should allow creating field facets.');


  const fc2 = fc
    .addFieldFacet('things')
    .removeFacet('things')

  t.ok(
    fc2.facetsByIndex().equals(Immutable.Map({})),
    'should allow removing facets'
  );


  const fc3 = fc
    .addFieldFacet('things')

  t.ok(fc3.facetsByIndex().equals(Immutable.Map({
    things: Immutable.Map([
      [Immutable.List(['a', 'b']), Immutable.Set([0])],
      [Immutable.List(['b', 'c']), Immutable.Set([1])],
      [Immutable.List(), Immutable.Set([2])]
    ])
  })), 'should allow creating facets on iterable facet values that should not be iterated');


  const fc4 = new FacetedClassification(nestedData)
    .addFieldFacet(['person', 'favorite_things'], { multiValue: true })

    t.ok(fc4.facetsByIndex().equals(Immutable.Map({
      'person.favorite_things': Immutable.Map({
        'lemonade': Immutable.Set([0, 1]),
        'lollipops': Immutable.Set([1]),
        'ice': Immutable.Set([2])
      })
    })), 'should allow facets to be created on nested fields.');

  const isOdd = new FacetedClassification([1, 2, 3])
    .addFacet('isOdd', val => val % 2 ? true : false)

  t.deepEqual(isOdd.facets().toJS(), {
    'isOdd': {
      'true': [1, 3],
      'false': [2]
    }
  }, 'should allow creating a facet based off an arbitrary function.');
})

test('Faceted query', t => {
  t.plan(7);

  const fc = new FacetedClassification(sampleData)
    .addFieldFacet('things', { multiValue: true })

  const fq = new FacetedQuery(fc)

  t.ok(Immutable.is(fq.selectedFacets(), fc.facets()))
  t.ok(Immutable.is(fq.selectedItems(), sampleData))


  const thingsWithB = fq.select({
    name: 'things',
    values: ['b']
  })

  t.deepEqual(thingsWithB.selectedFacetsByIndex().toJS(), {
    'things': {
      'a': [0],
      'b': [0, 1],
      'c': [1]
    }
  }, 'should allow facet values to be selected');

  t.deepEqual(thingsWithB.selectedItemsByIndex().toJS(), [0, 1]);


  const thingsWithBAndC = thingsWithB.select({
    name: 'things',
    values: ['c']
  });

  t.deepEqual(thingsWithBAndC.selectedFacetsByIndex().toJS(), {
    'things': {
      'b': [1],
      'c': [1]
    }
  }, 'should allow chaining which facets are selected');

  t.deepEqual(thingsWithBAndC.selectedFacetValues().toJS(), {
    'things': ['b', 'c']
  }, 'should allow selected facets to be retrieved');


  const multipleFacetQuery = new FacetedQuery(fc.addFacet('truth', () => true))

  t.deepEqual(
    multipleFacetQuery.selectedFacets(['truth']).keySeq().toJS(),
    ['truth'],
    'should allow inspecting the value of only certain facets.')
});

/*

test('Deselecting values', t => {
  t.plan(2);

  const facets = facet(sampleData)
    .addFieldFacet('things', { multiValue: true })

  const thingsWithB = facets.addSelection('things', ['b'])

  t.deepEqual(
    thingsWithB.removeSelection('things', ['b']).selectedIDs().toJS(),
    [1, 2, 3],
    'should allow deselecting facet values');

  t.deepEqual(thingsWithB.resetSelections('things').selectedIDs().toJS(),
    [1, 2, 3],
    'should allow resetting any of a field\'s selected values');
});
*/
