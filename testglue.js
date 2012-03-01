/**
 * Glue to make XPCShell test harness helpers work in a web page.
 */
function do_throw(text, stack) {
  console.error(text);
  throw text;
}

function print() {
  console.info.apply(console, arguments);
}

function do_execute_soon(func) {
  window.setTimeout(func, 0);
}

function do_test_pending() {}
function do_test_finished() {}

function do_check_eq(left, right) {
  let pass = left == right;
  console.log(pass ? "PASS" : "FAIL", left + " == " + right);
  if (!pass) {
    do_throw("FAIL");
  }
}

function do_check_true(condition) {
  do_check_eq(condition, true);
}

const _TEST_FILE = "test.js";


/*** XPCShell test harness helpers ***/

/**
 * Add a test function to the list of tests that are to be run asynchronously.
 *
 * Each test function must call run_next_test() when it's done. Test files
 * should call run_next_test() in their run_test function to execute all
 * async tests.
 *
 * @return the test function that was passed in.
 */
let gTests = [];
function add_test(func) {
  gTests.push(func);
  return func;
}

/**
 * Runs the next test function from the list of async tests.
 */
let gRunningTest = null;
let gTestIndex = 0; // The index of the currently running test.
function run_next_test()
{
  function _run_next_test()
  {
    if (gTestIndex < gTests.length) {
      do_test_pending();
      gRunningTest = gTests[gTestIndex++];
      print("TEST-INFO | " + _TEST_FILE + " | Starting " +
            gRunningTest.name);
      // Exceptions do not kill asynchronous tests, so they'll time out.
      try {
        gRunningTest();
      }
      catch (e) {
        do_throw(e);
      }
    }
  }

  // For sane stacks during failures, we execute this code soon, but not now.
  // We do this now, before we call do_test_finished(), to ensure the pending
  // counter (_tests_pending) never reaches 0 while we still have tests to run
  // (do_execute_soon bumps that counter).
  do_execute_soon(_run_next_test);

  if (gRunningTest !== null) {
    // Close the previous test do_test_pending call.
    do_test_finished();
  }
}
