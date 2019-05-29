"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _asyncToGenerator2 = _interopRequireDefault(require("@babel/runtime/helpers/asyncToGenerator"));

const fetchq = require('../lib/index');

const _require = require('../lib/interfaces'),
      FetchQDriver = _require.FetchQDriver;

const _require2 = require('../lib/errors'),
      FetchQDuplicateClientError = _require2.FetchQDuplicateClientError,
      FetchQDriverNotFoundError = _require2.FetchQDriverNotFoundError,
      FetchQDuplicateDriverError = _require2.FetchQDuplicateDriverError;

class CustomDriver extends FetchQDriver {}

describe.skip(`@fetchq/core`, () => {
  beforeEach(
  /*#__PURE__*/
  (0, _asyncToGenerator2.default)(function* () {
    yield fetchq.destroyAll();
  }));
  it(`should start an empty client`,
  /*#__PURE__*/
  (0, _asyncToGenerator2.default)(function* () {
    const client = yield fetchq.connect({
      driver: {
        type: CustomDriver
      }
    });
    yield client.isReady();
  }));
  it(`should NOT start the same client twice`,
  /*#__PURE__*/
  (0, _asyncToGenerator2.default)(function* () {
    expect.assertions(1);

    try {
      yield fetchq.connect({
        driver: {
          type: CustomDriver
        }
      });
      yield fetchq.connect({
        driver: {
          type: CustomDriver
        }
      });
    } catch (err) {
      expect(err).toBeInstanceOf(FetchQDuplicateClientError);
    }
  }));
  it(`should NOT start if the driver is unknown`,
  /*#__PURE__*/
  (0, _asyncToGenerator2.default)(function* () {
    expect.assertions(1);

    try {
      yield fetchq.connect({
        driver: {
          type: 'I do not exists'
        }
      });
    } catch (err) {
      expect(err).toBeInstanceOf(FetchQDriverNotFoundError);
    }
  }));
  it(`should start with a custom driver`,
  /*#__PURE__*/
  (0, _asyncToGenerator2.default)(function* () {
    expect.assertions(1);
    const mock = jest.fn();

    class CustomDriver extends FetchQDriver {
      constructor(config) {
        super(config);
        this.config = config;
      }

      connect() {
        mock(this.config);
      }

      destroy() {}

    }

    yield fetchq.connect({
      driver: {
        type: CustomDriver,
        opt1: 1
      }
    });
    expect(mock.mock.calls[0][0]).toEqual({
      opt1: 1
    });
  }));
  it(`should register a new driver`,
  /*#__PURE__*/
  (0, _asyncToGenerator2.default)(function* () {
    fetchq.registerDriver('foo', CustomDriver);
    const client = yield fetchq.connect({
      driver: {
        type: 'foo'
      }
    });
    yield client.isReady();
  }));
  it(`should NOT register the same driver twice`,
  /*#__PURE__*/
  (0, _asyncToGenerator2.default)(function* () {
    expect.assertions(1);

    try {
      fetchq.registerDriver('foo', CustomDriver);
      fetchq.registerDriver('foo', CustomDriver);
    } catch (err) {
      expect(err).toBeInstanceOf(FetchQDuplicateDriverError);
    }
  }));
  it(`should emit connection events`,
  /*#__PURE__*/
  (0, _asyncToGenerator2.default)(function* () {
    const client = fetchq.createClient({
      driver: {
        type: CustomDriver
      }
    });
    yield new Promise(resolve => {
      client.isReady().then(resolve);
      client.connect();
    });
    yield client.isReady();
  }));
});