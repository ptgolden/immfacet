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

  newFilters = this.appliedFilters.push(Immutable.Map({ id: matchedIDs }));

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
    filter: null,
    limit: null
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

// Filter obj should be in the form { fieldName: [...possible values...]}
FacetSet.prototype.applyFilters = function (filterList, docIDSet) {
  filterList.forEach(filterObj => {
    filterObj.forEach((possibleValues, field) => {
      const getFieldValue = docID => this.data.getIn([docID].concat(field));

      docIDSet = docIDSet
        .filter(docID => possibleValues.contains(getFieldValue(docID)))

      if (docIDSet.size === 0) return false;
    });
    if (docIDSet.size === 0) return false;
  });

  return docIDSet;
}

FacetSet.prototype._getNarrowedFacetValues = function (opts, fieldName) {
  var field = this.facets.get(fieldName)
    , filter = opts && opts.get('filter')
    , allFilters = this.appliedFilters

  if (filter) {
    if (!(filter instanceof Immutable.Map)) filter = Immutable.fromJS(filter);
    allFilters = allFilters.push(filter);
  }

  return field
    .map(docs => this.applyFilters(allFilters, docs))
    .filter(docs => docs.size)
}
