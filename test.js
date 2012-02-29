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
    let txn = db.transaction([STORE_NAME], IDBTransaction.READ_WRITE);
    let store = txn.objectStore(STORE_NAME);
    sampleRecords.forEach(function (record) {
      debug("Storing", record);
      store.put(record);
    });
    txn.oncomplete = function oncomplete() {
      callback(db);
    };
  });
}

function run_tests() {
  populateDB(run_next_test);
}

add_test(function () {
  let txn = gDB.transaction([STORE_NAME], IDBTransaction.READ_ONLY);
  let store = txn.objectStore(STORE_NAME);

  let request = Index("make").eq("BMW").query(store);
  request.onsuccess = function () {
    console.log(request.result);
    if (!request.result) {
      run_next_test();
    }
  };
});
