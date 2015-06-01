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
  this.appliedFilters = appliedFilters || Immutable.List();
  this.idField = idField;
}


/*
 * These methods will return new FacetSet objects
 **/
FacetSet.prototype.addFacet = function (name, reduceFn, context) {
  var newFacets = this.facets.set(name, this._makeFacetSync(reduceFn, context));
  return new FacetSet(this.data, this.idField, newFacets, this.appliedFilters);
}


FacetSet.prototype.addFieldFacet = function (fieldArr, name) {
  if (typeof fieldArr === 'string') fieldArr = [fieldArr];
  name = name || fieldArr.join('.');
  return this.addFacet(name, datum => datum.getIn(fieldArr))
}


FacetSet.prototype.select = function (facetName, values) {
  var facet = this.facets.get(facetName)
    , matchedIDs
    , newFilters

  if (!facet) throw new Error('No such facet field: ' + facetName);

  values = Immutable.Set(values);

  matchedIDs = facet
    .filter((docs, facetVal) => values.contains(facetVal))
    .toSet()
    .flatten()

  newFilters = this.appliedFilters.push(Immutable.Map({
    facetName,
    values,
    ids: matchedIDs
  }));

  return new FacetSet(this.data, this.idField, this.facets, newFilters);
}

/*
 * Helper functions
 ***/

FacetSet.prototype._makeFacetSync = function (classifyingFn, context) {
  var facet = Immutable.OrderedMap().asMutable();

  this.data.forEach(item => {
    var result = classifyingFn(item, context);

    if (!(result instanceof Immutable.Iterable)) result = [].concat(result);

    Immutable.List(result).forEach(facetValue => {
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

FacetSet.prototype.getMatchedIDs = function () {
  return this.appliedFilters.size ?
    this.appliedFilters.flatMap(filter => filter.get('ids')).toList() :
    this.data.keySeq().toList()
}

FacetSet.prototype.getMatchedDocuments = function () {
  return this.getMatchedIDs().map(id => this.data.get(id));
}

// Filter obj should be in the form { fieldName: [...possible values...]}
function applyFilters(filterList, docIDSet) {
  filterList.forEach(filterObj => {
    docIDSet = docIDSet.intersect(filterObj.get('ids'));
    if (docIDSet.size === 0) return false;
  });

  return docIDSet;
}

FacetSet.prototype._getNarrowedFacetValues = function (opts, fieldName) {
  var field = this.facets.get(fieldName)
    , allFilters = this.appliedFilters

  if (opts.get('ids')) {
    allFilters = allFilters.push(Immutable.Map({ ids: opts.get('ids') }))
  }

  if (!allFilters.size) {
    return field
  }

  return field
    .map(docs => applyFilters(allFilters, docs))
    .filter(docs => docs.size)
}
