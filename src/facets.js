"use strict";

var Immutable = require('immutable')

function makeKeyedSeqByID(dataset, idField) {
  return Immutable.Map().withMutations(map => {
    dataset.forEach(datum => {
      let id = datum.get(idField);

      if (id === undefined) {
        throw new Error(
          'Every indexed document must have an ID field. Currently looking ' +
          'for IDs in the property `' + idField + '`, which is not present in ' +
          ' document:\n  ' + JSON.stringify(datum)
        );
      }

      if (map.has(id)) {
        throw new Error(
          'Multiple documents have identical ID attribute (currentlyset to `' +
          idField + '`): ' + id
        );
      }

      map.set(id, datum);
    });
  });
}

module.exports = function (dataset, idField) {
  idField = idField || 'id';
  return new FacetSet(makeKeyedSeqByID(dataset, idField), idField)
}

function FacetSet(data, idField, facets, appliedFilters) {
  this.data = data;
  this.facets = facets || Immutable.Map();
  this.appliedFilters = appliedFilters || Immutable.OrderedSet();
  this._filterMatchCache = Immutable.Map();
  this.idField = idField;
}


/*
 * These methods will return new FacetSet objects
 **/
FacetSet.prototype.addFacet = function (name, reduceFn, opts) {
  var newFacets = this.facets.set(name, this._makeFacetSync(reduceFn, opts));
  return new FacetSet(this.data, this.idField, newFacets, this.appliedFilters);
}


FacetSet.prototype.addFieldFacet = function (fieldArr, opts) {
  if (typeof fieldArr === 'string') fieldArr = [fieldArr];
  return this.addFacet(fieldArr.join('.'), datum => datum.getIn(fieldArr), opts);
}


FacetSet.prototype.select = function (facetName, values) {
  var facet = this.facets.get(facetName)
    , newFilters

  if (!facet) throw new Error('No such facet field: ' + facetName);
  if (!(values instanceof Immutable.Iterable)) values = Immutable.fromJS(values);

  values = values.toSet();

  newFilters = this.appliedFilters.add(Immutable.Map({
    facetName,
    values
  }));

  return new FacetSet(this.data, this.idField, this.facets, newFilters);
}

FacetSet.prototype.deselect = function (facetName, values) {
  var newFilters

  this.appliedFilters.delete(Immutable.Map({
    facetName,
    values
  }));

  return new FacetSet(this.data, this.idField, this.facets, newFilters);
}

FacetSet.prototype.reset = function (facetName) {
  var newFilters

  if (facetName) {
    newFilters = this.appliedFilters
      .filter(filter => filter.get('facetName') !== facetName);
  } else {
    newFilters = this.appliedFilters.clear();
  }

  return new FacetSet(this.data, this.idField, this.facets, newFilters);
}

/*
 * Helper functions
 ***/

FacetSet.prototype._makeFacetSync = function (classifyingFn, opts) {
  var facet = Immutable.OrderedMap().asMutable()

  opts = opts || {};

  this.data.forEach(item => {
    var result = classifyingFn(item)
      , values

    if (!(result instanceof Immutable.Iterable)) result = [].concat(result);

    values = opts.singleValue ? Immutable.List.of(result) : Immutable.List(result);

    values.forEach(facetValue => {
      if (!facet.has(facetValue)) {
        facet.set(facetValue, Immutable.Set().asMutable());
      }
      facet.get(facetValue).add(item.get(this.idField))
    });
  });

  facet.forEach(resultSet => resultSet.asImmutable());

  return facet.asImmutable();
}

FacetSet.prototype.makeQuery = function (opts) {
  var QueryRecord = Immutable.Record({
    fields: this.facets.keySeq(),
    ids: null
  });
  return new QueryRecord(opts);
}

FacetSet.prototype.getFacetValues = function (opts) {
  var query = this.makeQuery(opts)

  return Immutable.List(query.get('fields'))
    .toOrderedMap()
    .mapEntries(kv => [kv[1], kv[1]])
    .map(field => this._getNarrowedFacetValues(query, field))
}

FacetSet.prototype.getSelectedFacets = function () {
  return this.appliedFilters.reduce((acc, filter) => {
    if (filter.has('facetName')) {
      let facetName = filter.get('facetName');
      if (!acc.has(facetName)) acc = acc.set(facetName, Immutable.Set());
      acc = acc.update(facetName, existingVals => existingVals.union(filter.get('values')));
    }
    return acc;
  }, Immutable.Map());
}

FacetSet.prototype.getMatchedFilterResults = function (filter) {
  if (!this._filterMatchCache.has(filter)) {
    let facetName = filter.get('facetName')
      , values = filter.get('values')
      , facet = this.facets.get(facetName)
      , matchedIDs

    matchedIDs = facet
      .filter((docs, facetVal) => values.contains(facetVal))
      .toSet()
      .flatten();

    this._filterMatchCache = this._filterMatchCache.set(filter, matchedIDs);
  }

  return this._filterMatchCache.get(filter);
}

FacetSet.prototype.getMatchedIDs = function () {
  return this.appliedFilters.size === 0 ?
    this.data.keySeq().toSet() :
    this.appliedFilters.map(filter => this.getMatchedFilterResults(filter))
      .reduce((prev, next) => prev.intersect(next))
}

FacetSet.prototype.getMatchedDocuments = function () {
  return this.getMatchedIDs().map(id => this.data.get(id));
}


FacetSet.prototype._getNarrowedFacetValues = function (opts, fieldName) {
  var field = this.facets.get(fieldName)
    , matchIDs = null

  if (this.appliedFilters.size) {
    matchIDs = this.getMatchedIDs();
  }

  if (opts.get('ids')) {
    let onlyIDs = Immutable.Set(opts.get('ids'));
    matchIDs = matchIDs ? matchIDs.intersect(onlyIDs) : onlyIDs;
  }

  if (matchIDs === null) {
    return field
  }

  return field
    .map(docs => docs.intersect(matchIDs))
    .filter(docs => docs.size)
}
