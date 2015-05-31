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

  var facets = facet(sampleData);

  facets.addFieldFacet(['type']);
  facets.addFieldFacet(['things']);

  t.deepEqual(facets.results().toJS(), {
    type: {
      'blargh': [1],
      'ugh': [2, 3],
    },
    things: {
      'a': [1],
      'b': [1, 2],
      'c': [2]
    }
  });
});

test('Nested facets', function (t) {
  t.plan(1);

  var data = Immutable.fromJS([
    { id: 1, person: { name: 'Diz', favorite_things: ['lemonade']  }},
    { id: 2, person: { name: 'Grizz', favorite_things: ['lemonade', 'lollipops']}},
    { id: 3, person: { name: 'Liz', favorite_things: ['ice']}}
  ])

  var facets = facet(data);
  facets.addFieldFacet(['person', 'favorite_things'])

  t.deepEqual(facets.results().toJS(), {
    'person.favorite_things': {
      'lemonade': [1, 2],
      'lollipops': [2],
      'ice': [3]
    }
  });
});

test('Narrow facets', function (t) {
  t.plan(1);

  var facets = facet(sampleData);
  facets.addFieldFacet('type');
  facets.addFieldFacet('things');

  var narrowed = facets.results({filter: { id: [1, 3] }});
  t.deepEqual(narrowed.toJS(), {
    type: { blargh: [1], ugh: [3] },
    things: { a: [1], b: [1] }
  });
});


test('Custom facet', function (t) {
  t.plan(2);

  var facets = facet(sampleData);
  function idIsOdd(val) { return val.get('id') % 2 ? true : false }


  facets.addFacet('id_is_odd', idIsOdd);
  t.deepEqual(facets.results().toJS(), {
    'id_is_odd': {
      'true': [1, 3],
      'false': [2]
    }
  });

  function idInContext(val, arr) { return arr.indexOf(val.get('id')) !== -1 }
  facets.addFacet('in_context_list', idInContext, [3]);
  t.deepEqual(facets.results().toJS(), {
    'id_is_odd': {
      'true': [1, 3],
      'false': [2]
    },
    'in_context_list': {
      'true': [3],
      'false': [1, 2]
    }
  });
})
