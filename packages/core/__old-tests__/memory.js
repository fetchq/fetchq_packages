"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

const fetchq = require('../lib/index');

const _require = require('../lib/interfaces'),
      FetchQDriver = _require.FetchQDriver,
      FetchQQueue = _require.FetchQQueue;

class MemoryQueue extends FetchQQueue {
  constructor(name) {
    super(name);
    this.init();
  } // Simulates an asynchronous setup of the queue where we should
  // check if the table exists in Postgres, else create it.


  init() {
    var _this = this;

    return (0, _asyncToGenerator2.default)(function* () {
      console.log('INIT MEM');
      return new Promise(resolve => {
        setTimeout(() => {
          _this.keys = {};
          _this.docs = [];
          _this.status = 2;

          _this.emit('ready');
        });
      });
    })();
  }

  push(docs) {
    var _this2 = this;

    return (0, _asyncToGenerator2.default)(function* () {
      console.log('PUSH', _this2.driver.client.status);
      yield _this2.isReady();
      let skipped = 0;
      let created = 0;
      docs.forEach(doc => {
        if (_this2.keys[doc.subject]) {
          skipped++;
          return;
        }

        _this2.keys[doc.subject] = true;

        _this2.docs.push(doc);

        created++;
      });
      return {
        skipped,
        created
      };
    })();
  }

  count() {
    return (0, _asyncToGenerator2.default)(function* () {
      return 0;
    })();
  }

}

class MemoryDriver extends FetchQDriver {
  constructor(config, client) {
    super(config, client);
    this.queues = {};
  } // Simulate an asynchronous connection to the database


  connect() {
    return (0, _asyncToGenerator2.default)(function* () {
      return new Promise(resolve => setTimeout(resolve, 10));
    })();
  }

  createQueueRef(name) {
    return new MemoryQueue(name);
  }

}

describe.skip('FetchQ Memory Driver', () => {
  let client = null;
  beforeEach(
  /*#__PURE__*/
  (0, _asyncToGenerator2.default)(function* () {
    client = fetchq.createClient({
      driver: {
        type: MemoryDriver
      }
    });
  }));
  afterEach(
  /*#__PURE__*/
  (0, _asyncToGenerator2.default)(function* () {
    yield fetchq.destroyAll();
  }));
  it(`should get a new reference`, () => {
    expect.assertions(1);
    const ref = client.ref('q1');
    expect(ref).toBeInstanceOf(FetchQQueue);
  });
  it(`should be able to queue documents`,
  /*#__PURE__*/
  (0, _asyncToGenerator2.default)(function* () {
    expect.assertions(2); // await client.connect()

    const res = yield client.ref('q1').push([{
      subject: 'd1'
    }, {
      subject: 'd2'
    }, {
      subject: 'd2'
    }]);
    expect(res.skipped).toBe(1);
    expect(res.created).toBe(2);
  }));
});