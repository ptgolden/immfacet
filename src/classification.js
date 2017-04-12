const Immutable = require('immutable')
    , { isIterable, isOrdered } = Immutable.Iterable


function FacetedClassification(items=Immutable.List(), _facetsByIndex=Immutable.Map()) {
  if (!(this instanceof FacetedClassification)) {
    return new FacetedClassification(items, _facetsByIndex);
  }

  if (Array.isArray(items)) {
    items = Immutable.List(items)
  }

  if (!isOrdered(items)) {
    throw new Error("Items for a faceted classification must be an ordered iterable.")
  }

  this.items = items;
  this._facetsByIndex = _facetsByIndex;
}

Object.assign(FacetedClassification.prototype, {
  hashCode() {
    return this.items.hashCode() + this._facetsByIndex.hashCode()
  },

  equals(other) {
    return (
      this.items.equals(other.items) &&
      this._facetsByIndex.equals(other._facetsByIndex)
    )
  },

  facets() {
    return this._facetsByIndex
      .map(values => values.map(itemIndices => itemIndices.map(i => this.items.get(i))))
  },

  facetsByIndex() {
    return this._facetsByIndex;
  },

  addFacet(name, fn, opts={}) {
    const { multiValue } = opts
        , facet = Immutable.Map().asMutable()

    this.items.forEach((item, key) => {
      const result = fn(item)

      const values = multiValue
        ? Immutable.List(result)
        : Immutable.List.of(result)

      values.forEach(value => {
        facet.update(
          value,
          Immutable.Set(),
          set => set.asMutable().add(key)
        )
      })
    });

    return new FacetedClassification(
      this.items,
      this._facetsByIndex.set(name, facet.map(set => set.asImmutable()).asImmutable())
    )
  },

  addFieldFacet(field, opts) {
    const path = Array.isArray(field) ? field : field.split('.')
        , accessor = d => d.getIn(path)

    return this
      .addFacet(path.join('.'), accessor, opts)
  },

  removeFacet(name) {
    return new FacetedClassification(
      this.items,
      this._facetsByIndex.delete(name)
    )
  }
})

module.exports = FacetedClassification;
