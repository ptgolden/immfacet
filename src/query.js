"use strict";

const Immutable = require('immutable')
    , FacetedClassification = require('./classification')


const FacetSelection = Immutable.Record({
  name: null,
  values: Immutable.Set()
})


function FacetedQuery(facetedClassification, selections=Immutable.List()) {
  if (!(this instanceof FacetedQuery)) {
    return new FacetedQuery(facetedClassification, selections)
  }

  if (!(facetedClassification instanceof FacetedClassification)) {
    throw new Error('Must pass a FacetedClassification object to FacetedQuery.')
  }

  this.facetedClassification = facetedClassification;
  this.selections = selections;
}

Object.assign(FacetedQuery.prototype, {
  select({ name, values }) {
    if (!this.facetedClassification.facetsByIndex().has(name)) {
      throw new Error(`No such facet: ${name}`);
    }

    return new FacetedQuery(
      this.facetedClassification,
      this.selections.push(new FacetSelection({
        name,
        values: Immutable.Set(values)
      }))
    )
  },

  deselect({ name, values }) {
    return new FacetedQuery(
      this.facetedClassification,
      this.selections.delete(new FacetSelection({
        name,
        values: Immutable.Set(values)
      }))
    )
  },

  reset(name) {
    return new FacetedQuery(
      this.facetedClassification,
      name
        ? this.selections.filter(selection => selection.name !== name)
        : this.selections.clear()
    )
  },

  selectedFacetsByIndex(returnedFields) {
    const selectedItemsByIndex = this.selectedItemsByIndex()
        , fields = returnedFields || this.facetedClassification.facetsByIndex().keySeq()

    return Immutable.Map().withMutations(map => {
      fields.forEach(name => {
        const facet = this.facetedClassification.facetsByIndex().get(name)

        map.set(name, this.selections.size === 0
          ? facet
          : facet
            .map(indices => indices.intersect(selectedItemsByIndex))
            .filter(indices => indices.size)
        )
      })
    })
  },

  selectedFacets(returnedFields) {
    return this.selectedFacetsByIndex(returnedFields)
      .map(facet => facet.map(indices => indices.map(i => this.facetedClassification.items.get(i))))
  },

  selectedFacetValues() {
    return this.selectedFacetsByIndex()
      .map(facet => facet.keySeq().toSet())
  },

  selectedItemsByIndex() {
    return this.selections.size === 0
      ? this.facetedClassification.items.keySeq()
      : this.selections
          .map(({ name, values }) =>
            this.facetedClassification.facetsByIndex().get(name)
              .filter((indices, facetValue) => values.contains(facetValue))
              .toSet()
              .flatten())
          .reduce((prev, next) => prev.intersect(next))
  },

  selectedItems() {
    return this.selectedItemsByIndex()
      .map(id => this.facetedClassification.items.get(id))
  }
})


module.exports = FacetedQuery;
