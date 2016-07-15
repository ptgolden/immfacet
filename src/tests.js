"use strict";

const test = require('tape')
    , Immutable = require('immutable')
    , facet = require('./')


const sampleData = Immutable.fromJS([
  { id: 1, type: 'blargh', things: ['a', 'b'] },
  { id: 2, type: 'ugh', things: ['b', 'c'] },
  { id: 3, type: 'ugh', things: [] }
])


const nestedData = Immutable.fromJS([
  { id: 1, person: { name: 'Diz', favorite_things: ['lemonade']  }},
  { id: 2, person: { name: 'Grizz', favorite_things: ['lemonade', 'lollipops']}},
  { id: 3, person: { name: 'Liz', favorite_things: ['ice']}}
])


test('Facets', t => {
  t.plan(4);

  const facetSet = facet(sampleData)

  const a = facetSet
    .addFieldFacet(['type'])
    .addFieldFacet('things', { multiValue: true })

  t.ok(a.facets.equals(
    Immutable.Map({
      type: Immutable.Map({
        'blargh': Immutable.Set([1]),
        'ugh': Immutable.Set([2, 3]),
      }),
      things: Immutable.Map({
        'a': Immutable.Set([1]),
        'b': Immutable.Set([1, 2]),
        'c': Immutable.Set([2])
      })
    })
  ), 'should allow creating field facets.');


  const b = facetSet
    .addFieldFacet('things')
    .removeFacet('things')

  t.ok(
    b.facets.equals(Immutable.Map({})),
    'should allow removing facets'
  );


  const c = facetSet
    .addFieldFacet('things')

  t.ok(c.facets.equals(Immutable.Map({
    things: Immutable.Map([
      [Immutable.List(['a', 'b']), Immutable.Set([1])],
      [Immutable.List(['b', 'c']), Immutable.Set([2])],
      [Immutable.List(), Immutable.Set([3])]
    ])
  })), 'should allow creating facets on iterable facet values that should not be iterated');

  const facetSetB = facet(nestedData)

  const d = facetSetB
    .addFieldFacet(['person', 'favorite_things'], { multiValue: true })

    t.ok(d.facets.equals(Immutable.Map({
      'person.favorite_things': Immutable.Map({
        'lemonade': Immutable.Set([1, 2]),
        'lollipops': Immutable.Set([2]),
        'ice': Immutable.Set([3])
      })
    })), 'should allow facets to be created on nested fields.');
});


test('Filtering by ID', t => {
  t.plan(2);

  const facets = facet(sampleData)
    .addFieldFacet('type')
    .addFieldFacet('things', { multiValue: true })

  const narrowedByID = facets.facetsAfterSelections({ forIDs: [1, 3] });

  t.deepEqual(narrowedByID.toJS(), {
    type: { blargh: [1], ugh: [3] },
    things: { a: [1], b: [1] }
  }, 'should allow a query to filter documents by ID.');

  const narrowedByField = facets.facetsAfterSelections({ forFields: ['type'] });
  t.deepEqual(narrowedByField.toJS(), {
    type: { blargh: [1], ugh: [2, 3] },
  }, 'should allow a query to select which facet fields to include.');
});


test('Custom facet', t => {
  t.plan(1);

  const isOdd = facet(sampleData)
    .addFacet('id_is_odd', val => val.get('id') % 2 ? true : false)

  t.deepEqual(isOdd.facets.toJS(), {
    'id_is_odd': {
      'true': [1, 3],
      'false': [2]
    }
  }, 'should allow creating a facet based off an arbitrary function.');
})


test('Selecting values', t => {
  t.plan(6);

  const facets = facet(sampleData)
    .addFieldFacet('things', { multiValue: true })

  t.deepEqual(facets.selectedIDs().toJS(), [1, 2, 3]);
  t.deepEqual(facets.selectedItems().toJS(), sampleData.toJS());

  const thingsWithB = facets.addSelection('things', ['b']);
  t.deepEqual(thingsWithB.facetsAfterSelections().toJS(), {
    'things': {
      'a': [1],
      'b': [1, 2],
      'c': [2]
    }
  }, 'should allow facet values to be selected');

  t.deepEqual(thingsWithB.selectedIDs().toJS(), [1, 2]);

  const thingsWithBAndC = thingsWithB.addSelection('things', ['c']);
  t.deepEqual(thingsWithBAndC.facetsAfterSelections().toJS(), {
    'things': {
      'b': [2],
      'c': [2]
    }
  }, 'should allow chaining which facets are selected');

  t.deepEqual(thingsWithBAndC.facetValuesAfterSelections().toJS(), {
    'things': ['b', 'c']
  }, 'should allow selected facets to be retrieved');
});


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
