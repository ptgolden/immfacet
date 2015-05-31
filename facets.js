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

function Facets(dataset, opts) {
  if (!(this instanceof Facets)) return new Facets(dataset, opts);

  opts = opts || {};

  this.facets = Immutable.Map();
  this.idField = opts.idField || 'id';

  this.dataset = makeKeyedSeqByID(dataset, this.idField);
}

Facets.prototype.addFacet = function (name, reduceFn, context) {
  this.facets = this.facets.set(name, this._makeFacetSync(reduceFn, context));
}

Facets.prototype.addFieldFacet = function (fieldArr, name) {
  if (typeof fieldArr === 'string') fieldArr = [fieldArr];
  name = name || fieldArr.join('.');
  return this.addFacet(name, datum => datum.getIn(fieldArr))
}

Facets.prototype._makeFacetSync = function (classifyingFn, context) {
  var facet = Immutable.OrderedMap().asMutable();

  this.dataset.forEach(item => {
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

Facets.prototype.makeQuery = function (opts) {
  var QueryRecord = Immutable.Record({
    fields: this.facets.keySeq(),
    filter: null,
    limit: null
  });
  return new QueryRecord(opts);
}

Facets.prototype.results = function (opts) {
  var query = this.makeQuery(opts)

  return Immutable.List(query.get('fields'))
    .toOrderedMap()
    .mapEntries(kv => [kv[1], kv[1]])
    .map(field => this._getNarrowedFacetValues(query, field))
}

// Filter obj should be in the form { fieldName: [...possible values...]}
Facets.prototype.applyFilters = function (filterObj, docIDSet) {
  if (!(filterObj instanceof Immutable.Map)) {
    filterObj = Immutable.fromJS(filterObj);
  }

  filterObj.forEach((possibleValues, field) => {
    const getFieldValue = docID => this.dataset.getIn([docID].concat(field));

    docIDSet = docIDSet
      .filter(docID => possibleValues.contains(getFieldValue(docID)))

    if (docIDSet.size === 0) return false;
  });

  return docIDSet;
}

Facets.prototype._getNarrowedFacetValues = function (opts, fieldName) {
  var field = this.facets.get(fieldName)
    , filter = opts && opts.get('filter')

  if (!filter) return field;

  return field
    .map(docs => this.applyFilters(filter, docs))
    .filter(docs => docs.size)
}

module.exports = Facets;
