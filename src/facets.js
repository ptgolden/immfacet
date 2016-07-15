"use strict";

const Immutable = require('immutable')
    , { isIterable } = Immutable.Iterable


function makeKeyedSeqByField(data, keyField) {
  return Immutable.Map().withMutations(map => {
    data.forEach(datum => {
      const value = datum.get(keyField)

      if (value === undefined) {
        throw new Error(
          `Every indexed document must have a key field. Currently looking ` +
          `for keys in the property "${keyField}" which is not present in ` +
          `document:\n\n${JSON.stringify(datum)}\n`
        );
      }

      if (map.has(value)) {
        throw new Error(
          `Multiple documents have identical key value ` +
          `(currently set to "${keyField}"): ${value}`
        );
      }

      map.set(value, datum);
    });
  });
}


const makeSelection = (name, values) =>
  Immutable.Map({
    name,
    values: (isIterable(values) ? values : Immutable.fromJS(values)).toSet()
  })

const withoutName = (set, name) =>
  set.filter(item => item.get('name') !== name)


const FacetSet = Immutable.Record({
  data: null,
  keyField: null,
  facets: Immutable.Map(),
  selections: Immutable.OrderedSet(),
  _selectionResultCache: Immutable.Map()
});


/* These will return new FacetSet objects */
Object.assign(FacetSet.prototype, {
  addFacet(name, fn, opts) {
    return this
      .delete('_selectionResultCache')
      .update('facets', facets =>
        facets.set(name, makeFacet(this, fn, opts)))
  },

  addFieldFacet(field, opts) {
    const path = Array.isArray(field) ? field : field.split('.')
        , accessor = d => d.getIn(path)

    return this
      .addFacet(path.join('.'), accessor, opts)
  },

  removeFacet(name) {
    return this
      .delete('_selectionResultCache')
      .update('facets', facets =>
        facets.delete(name))
      .update('selections', selections =>
        withoutName(selections, name))
  },

  addSelection(name, values) {
    if (!this.facets.has(name)) {
      throw new Error(`No such facet: ${name}`);
    }

    return this
      .update('selections', selections =>
        selections.add(makeSelection(name, values)))
  },

  removeSelection(name, values) {
    return this
      .update('selections', selections =>
        selections.delete(makeSelection(name, values)))
  },

  resetSelections(name) {
    return this
      .update('selections', selections =>
        name ? withoutName(selections, name) : selections.clear())
  },

  facetsAfterSelections(opts={}) {
    const { forIDs, forFields } = opts
        , fields = forFields || this.facets.keySeq();

    const selectedIDs = this.selectedIDs()

    return Immutable.Map().withMutations(map => {
      Immutable.List(fields).forEach(name => {
        const facet = this.facets.get(name)

        let matchIDs

        if (this.selections.size) {
          matchIDs = selectedIDs;
        }

        if (forIDs) {
          matchIDs = matchIDs
            ? matchIDs.intersect(forIDs)
            : Immutable.Set(forIDs)
        }

        map.set(name, !matchIDs
          ? facet
          : facet
              .map(ids => ids.intersect(matchIDs))
              .filter(ids => ids.size)
        )
      })
    })
  },

  facetValuesAfterSelections(opts={}) {
    return this.facetsAfterSelections(opts)
      .map(field => field.keySeq().toSet())
  },

  selectedIDs() {
    return this.selections.size === 0
      ? this.data.keySeq()
      : this.selections
          .map(selection => matchedIDsForSelection(this, selection))
          .reduce((prev, next) => prev.intersect(next))
  },

  selectedItems() {
    return this.selectedIDs().map(id => this.data.get(id))
  }
})


function makeFacet(facetSet, fn, opts={}) {
  const { multiValue } = opts
      , facet = Immutable.Map().asMutable()

  facetSet.data.forEach(item => {
    const key = item.get(facetSet.keyField)

    let result = fn(item)

    result = isIterable(result) ? result : Immutable.fromJS(result)

    const values = multiValue
      ? Immutable.List(result)
      : Immutable.List.of(result)

    values.forEach(value => {
      facet.update(
        value,
        Immutable.Set(),
        set => set.asMutable().add(key)
      )
    });
  });

  return facet.map(set => set.asImmutable()).asImmutable();
}


function matchedIDsForSelection(facetSet, selection) {
  const name = selection.get('name')
      , selectedValues = selection.get('values')
      , facet = facetSet.facets.get(name)

  return facet
    .filter((itemIDs, facetValue) => selectedValues.contains(facetValue))
    .toSet()
    .flatten()
}

module.exports = function (data, keyField='id') {
  return new FacetSet({
    data: makeKeyedSeqByField(data, keyField),
    keyField
  })
}
