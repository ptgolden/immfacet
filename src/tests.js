"use strict";

var test = require('tape')
  , Immutable = require('immutable')
  , facet = require('./')

const sampleData = Immutable.fromJS([
  { id: 1, type: 'blargh', things: ['a', 'b'] },
  { id: 2, type: 'ugh', things: ['b', 'c'] },
  { id: 3, type: 'ugh', things: [] }
])

test('Create facets', function (t) {
  t.plan(1);

  var facets = facet(sampleData)
    .addFieldFacet(['type'])
    .addFieldFacet('things', { multiValue: true })

  t.deepEqual(facets.getFacetValues().toJS(), {
    type: {
      'blargh': [1],
      'ugh': [2, 3],
    },
    things: {
      'a': [1],
      'b': [1, 2],
      'c': [2]
    }
  }, 'should allow creating field facets.');
});

test('Single valued facets', function (t) {
  t.plan(1);

  var singleValueThingFacet = facet(sampleData)
    .addFieldFacet('things')

  var expected = Immutable.OrderedMap({
    things: Immutable.OrderedMap([
      [Immutable.List(['a', 'b']), Immutable.Set([1])],
      [Immutable.List(['b', 'c']), Immutable.Set([2])],
      [Immutable.List(), Immutable.Set([3])]
    ])
  });

  t.ok(singleValueThingFacet.getFacetValues().equals(expected),
      'should allow creating facets on iterable facet values that should not be iterated');
});


test('Nested facets', function (t) {
  t.plan(1);

  var data = Immutable.fromJS([
    { id: 1, person: { name: 'Diz', favorite_things: ['lemonade']  }},
    { id: 2, person: { name: 'Grizz', favorite_things: ['lemonade', 'lollipops']}},
    { id: 3, person: { name: 'Liz', favorite_things: ['ice']}}
  ])

  var facets = facet(data).addFieldFacet(['person', 'favorite_things'], { multiValue: true })

  t.deepEqual(facets.getFacetValues().toJS(), {
    'person.favorite_things': {
      'lemonade': [1, 2],
      'lollipops': [2],
      'ice': [3]
    }
  }, 'should allow facets to be created on nested fields.');
});

test('Narrow facets', function (t) {
  t.plan(2);

  var facets = facet(sampleData)
    .addFieldFacet('type')
    .addFieldFacet('things', { multiValue: true })

  var narrowedByID = facets.getFacetValues({ ids: [1, 3] });
  t.deepEqual(narrowedByID.toJS(), {
    type: { blargh: [1], ugh: [3] },
    things: { a: [1], b: [1] }
  }, 'should allow a query to filter documents by ID.');

  var narrowedByField = facets.getFacetValues({ fields: ['type'] });
  t.deepEqual(narrowedByField.toJS(), {
    type: { blargh: [1], ugh: [2, 3] },
  }, 'should allow a query to select which facet fields to include.');
});


test('Custom facet', function (t) {
  t.plan(1);

  var isOdd = facet(sampleData)
    .addFacet('id_is_odd', function (val) {
      return val.get('id') % 2 ? true : false;
    });

  t.deepEqual(isOdd.getFacetValues().toJS(), {
    'id_is_odd': {
      'true': [1, 3],
      'false': [2]
    }
  }, 'should allow creating a facet based off an arbitrary function.');
})

test('Selecting values', function (t) {
  t.plan(6);
  var facets = facet(sampleData).addFieldFacet('things', { multiValue: true });

  t.deepEqual(facets.getMatchedIDs().toJS(), [1, 2, 3]);
  t.deepEqual(facets.getMatchedDocuments().toJS(), sampleData.toJS());

  var thingsWithB = facets.select('things', ['b']);
  t.deepEqual(thingsWithB.getFacetValues().toJS(), {
    'things': {
      'a': [1],
      'b': [1, 2],
      'c': [2]
    }
  }, 'should allow facet values to be selected');

  t.deepEqual(thingsWithB.getMatchedIDs().toJS(), [1, 2]);

  var thingsWithBAndC = thingsWithB.select('things', ['c']);
  t.deepEqual(thingsWithBAndC.getFacetValues().toJS(), {
    'things': {
      'b': [2],
      'c': [2]
    }
  }, 'should allow chaining which facets are selected');

  t.deepEqual(thingsWithBAndC.getSelectedFacetValues().toJS(), {
    'things': ['b', 'c']
  }, 'should allow selected facets to be retrieved');
});

test('Deselecting values', function (t) {
  t.plan(2);

  var facets = facet(sampleData).addFieldFacet('things', { multiValue: true });

  var thingsWithB = facets.select('things', ['b']);

  t.deepEqual(
    thingsWithB.deselect('things', ['b']).getMatchedIDs().toJS(),
    [1, 2, 3],
    'should allow deselecting facet values');

  t.deepEqual(thingsWithB.reset('things').getMatchedIDs().toJS(),
    [1, 2, 3],
    'should allow resetting any of a field\'s selected values');
});
