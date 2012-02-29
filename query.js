/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

function Index(name) {
  function queryMaker(op) {
    return function () {
      return Query(name, op, arguments);
    };
  }
  return {
    eq:      queryMaker("eq"),
    neq:     queryMaker("neq"),
    gt:      queryMaker("gt"),
    gteq:    queryMaker("gteq"),
    lt:      queryMaker("lt"),
    lteq:    queryMaker("lteq"),
    between: queryMaker("between"),
    betweeq: queryMaker("betweeq"),
    oneof:   function oneof() {
      let values = Array.slice(arguments);
      let query = Index(name, "eq", [values.shift()]);
      while (values.length) {
        query = query.or(Index(name, "eq", [values.shift()]));
      }
      return query;
    }
  };
}

function newRequest() {
  // TODO do we need anything else?
  return {};
}

let BaseQuery = {
  and: function and(query2) {
    return Intersection(this, query2);
  },

  or: function or(query2) {
    return Union(this, query2);
  },

  query: function query(store) {
    let request = newRequest();
    let keys;
    let event = {target: request}; //TODO type? what else?
    request.continue = function continue_() {
      if (!keys) {
        throw "XXX TODO";
      }
      let key = keys.shift();
      if (!key) {
        request.result = undefined;
        request.onsuccess(event);
        return;
      }
      let r = store.get(key);
      r.onsuccess = function onsuccess() {
        request.key = key;
        request.result = r.result;
        request.onsuccess(event);
      };
    };
    this.queryKeys(store, function (result) {
      keys = result;
      request.contine();
    });
    return request;
  },

  queryKeys: function queryKeys() {
    //TODO writeme
  },

  queryAll: function queryAll(store) {
    //TODO writeme
  }
};

function Query(index, op, values) {
  function compositeQueryMaker(conj) {
    return function (query2) {
      let query1 = this;
      return CompositeQuery(query1, conj, query2);
    };
  }

  function makeRange() {
    let range;
    switch (op) {
      case "eq":
        range = IDBKeyRange.only(values[0]);
        break;
      case "lt":
        range = IDBKeyRange.lowerBound(values[0]);
        break;
      case "lteq":
        range = IDBKeyRange.lowerBound(values[0]);
        range.lowerOpen = true;
        break;
      case "gt":
        range = IDBKeyRange.upperBound(values[0]);
        break;
      case "gteq":
        range = IDBKeyRange.upperBound(values[0]);
        range.upperOpen = true;
        break;
      case "between":
        range = IDBKeyRange.bound(values[0], values[1]);
        break;
      case "betweeq":
        range = IDBKeyRange.bound(values[0], values[1]);
        range.lowerOpen = range.upperOpen = true;
        break;
    }
    return range;
  }

  return {
    __proto__: BaseQuery,

    queryKeys: function queryKeys(store, callback) {
      let negate = false;
      if (op == "neq") {
        op = "eq";
        negate = true;
      }

      let index = store.index(this.index);
      let range = makeRange();
      let request = index.getAllKeys(range);
      request.onsuccess = function onsuccess(event) {
        let result = request.result;
        if (!negate) {
          callback(result);
          return;
        }

        // Deal with the negation case. This means we fetch all keys and then
        // subtract the original result from it.
        request = index.getAllKeys();
        request.onsuccess = function onsuccess(event) {
          let all = request.result;
          callback(arraySub(all, result));
        };
      };
    }
  };
}

function Intersection(query1, query2) {
  return {
    __proto__: BaseQuery,
    queryKeys: function queryKeys(store, callback) {
      query1.queryKeys(store, function (keys1) {
        query2.queryKeys(store, function (keys2) {
          callback(arrayIntersection(keys1, keys2));
        });
      });
    }
  };
}

function Union(query1, query2) {
  return {
    __proto__: BaseQuery,
    queryKeys: function queryKeys(store, callback) {
      query1.queryKeys(store, function (keys1) {
        query2.queryKeys(store, function (keys2) {
          callback(arrayUnion(keys1, keys2));
        });
      });
    }
  };
}


function arraySub(minuend, subtrahend) {
  if (!minuend.length || !subtrahend.length) {
    return minuend;
  }
  return minuend.filter(function(item) {
    return subtrahend.indexOf(item) == -1;
  });
}

function arrayUnion(foo, bar) {
  if (!foo.length) {
    return bar;
  }
  if (!bar.length) {
    return foo;
  }
  return foo.concat(arraySub(bar, foo));
}

function arrayIntersect(foo, bar) {
  if (!foo.length) {
    return foo;
  }
  if (!bar.length) {
    return bar;
  }
  return foo.filter(function(item) {
    return bar.indexOf(item) != -1;
  });
}
