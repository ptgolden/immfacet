# 0.5.0 - 2 June 2015
  * Removed `singleValue` option to `addFacet`. All values returned from a
    classifying function are now assumed to be single-valued unless the
    `multiValue` option is given.
  * Add `.reset` and `deselect` methods
  * Rename `getSelectedFacets` to `getSelectedFacetValues`

# 0.4.0 - 1 June 2015
  * Remove `context` argument from faceting functions
  * Add documentation for API
  * Add `singleValue` option to `addFacet` to force an iterable result returned
    from a classifying function to be treated as a single facet value

# 0.3.0 - 1 June 2015
  * Filtering can only be done by ID, not by arbitrary field
  * New methods (`getMatchedIDs`, `getMatchedDocuments`) for retrieving matches

# 0.2.0 - 1 June 2015
  * FacetSet objects are immutable; changing them returns new FacetSet objects
  * Add `select` function to narrow a FacetSet to a set of particular facet
    values

# 0.1.0 - 31 May 2015
  * Initial implementation
