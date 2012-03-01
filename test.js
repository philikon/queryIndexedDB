/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

function debug() {
  let args = Array.slice(arguments);
  args.unshift("DEBUG");
  console.log.apply(console, args);
}

const DB_NAME = "testquery";
const DB_VERSION = 1;
const STORE_NAME = "lemonscars";

let sampleRecords = [
  {name: "ECTO-1",
   year: 1989,
   make: "BMW",
   model: "325i",
   races: 1},
  {name: "ECTO-2",
   year: "1984ish",
   make: "BMW",
   model: "325e",
   races: 3},
  {name: "Cheesy",
   year: 1984,
   make: "BMW",
   model: "325e",
   races: 9},
  {name: "Pikachubaru",
   year: 2001,
   make: "Subaru",
   model: "Legacy Outback",
   races: 5},
  {name: "Ferdinand the Bug",
   year: 1971,
   make: "Volkswagen",
   model: "Super Beetle",
   races: 0}
];

function openDB(callback) {
  let indexedDB = window.mozIndexedDB;
  let request = indexedDB.open(DB_NAME, DB_VERSION);
  request.onsuccess = function (event) {
    debug("Opened database:", DB_NAME, DB_VERSION);
    callback(request.result);
  };
  request.onupgradeneeded = function (event) {
    debug("Database needs upgrade:", DB_NAME,
          event.oldVersion, event.newVersion);
    debug("Correct old database version:", event.oldVersion == 0);
    debug("Correct new database version:", event.newVersion == DB_VERSION);

    let db = request.result;
    let store = db.createObjectStore(STORE_NAME, {keyPath: "name"});
    store.createIndex("year",  "year",  { unique: false });
    store.createIndex("make",  "make",  { unique: false });
    store.createIndex("model", "model",  { unique: false });
    store.createIndex("races", "races", { unique: false });
  };
  request.onerror = function (event) {
    debug("Failed to open database", DB_NAME);
  };
  request.onblocked = function (event) {
    debug("Opening database request is blocked.");
  };
}

let gDB;
function populateDB(callback) {
  openDB(function (db) {
    gDB = db;
    let txn = gDB.transaction([STORE_NAME], IDBTransaction.READ_WRITE);
    let store = txn.objectStore(STORE_NAME);
    txn.oncomplete = function oncomplete() {
      console.debug("Populate transaction completed.");
      callback();
    };
    sampleRecords.forEach(function (record) {
      debug("Storing", record);
      store.put(record);
    });
  });
}

function openStore() {
  let txn = gDB.transaction([STORE_NAME], IDBTransaction.READ_ONLY);
  txn.oncomplete = run_next_test;
  txn.onabort = function () {
    console.error("The transaction was aborted because an error occurred.");
  };
  let store = txn.objectStore(STORE_NAME);
  return store;
}

function compareKeys(keys, expectedKeys) {
  //TODO for now we don't care about order
  do_check_eq(keys.length, expectedKeys.length);
  do_check_eq(arrayUnion(keys, expectedKeys).length, keys.length);
}

function add_query_tests(query, expectedKeys) {
  add_test(function test_empty() {
    let request = query.openCursor(openStore());
    let keys = [];
    request.onsuccess = function onsuccess() {
      if (request.result == undefined) {
        compareKeys(keys, expectedKeys);
        return;
      }
      keys.push(request.result.name);
    };
  });

  add_test(function test_openKeyCursor() {
    let request = query.openKeyCursor(openStore());
    let keys = [];
    request.onsuccess = function onsuccess() {
      if (request.result == undefined) {
        compareKeys(keys, expectedKeys);
        return;
      }
      keys.push(request.result);
    };
  });

  add_test(function test_getAll() {
    let request = query.getAll(openStore());
    request.onsuccess = function onsuccess() {
      let keys = request.result.map(function (item) { return item.name; });
      compareKeys(keys, expectedKeys);
    };
  });

  add_test(function test_getAllKeys() {
    let request = query.getAllKeys(openStore());
    request.onsuccess = function onsuccess() {
      compareKeys(request.result, expectedKeys);
    };
  });

}

function run_tests() {
  populateDB(run_next_test);
}


/*** Tests start here ***/

add_query_tests(Index("make").eq("Chevrolet"),
                []);
add_query_tests(Index("make").eq("BMW"),
                ["ECTO-1", "ECTO-2", "Cheesy"]);
add_query_tests(Index("make").eq("BMW").and(Index("model").eq("325e")),
                ["ECTO-2", "Cheesy"]);
add_query_tests(Index("make").oneof("Volkswagen", "Subaru"),
                ["Pikachubaru", "Ferdinand the Bug"]);
