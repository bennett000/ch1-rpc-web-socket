import {
  RPCAsyncContainerDictionary,
  RPCAsyncType,
  RPCEventType,
} from './interfaces';
import { defer, isDefer, isFunction, noop } from './utils';
import * as rp from './remote-procedure';

describe('remoteProcedure functions', () => {
  let config;

  beforeEach(() => {
    config = {
      emit: noop,
      enableStackTrace: false,
      message: '',
      on: () => noop,
      remote: {},
      uid: () => 'random id',
    };
  });

  describe('create function', () => {
    it('should call  promise remote if given a promise', () => {
      const dict = Object.create(null);
      rp.create(config, dict, 'some func', RPCAsyncType.promise)('arg');
      expectDeferIn(dict);
    });

    // it('should call callbackRemote if given a nodeCallback', () => {
    //   const dict = Object.create(null);
    //   rp.create(config, dict, 'some func', 'nodeCallback')('arg', noop);
    //   expectFunctionIn(dict);
    // });

    it('should default to config', () => {
      const dict = Object.create(null);
      config.defaultAsyncType = RPCAsyncType.promise;
      rp.create(config, dict, 'some func')();
      expectDeferIn(dict);
    });
  });

  // describe('callbackRemote', () => {
  //   it('should throw if not given a callback', () => {
  //     const dict: RPCAsyncContainerDictionary = {};
  //     const post = noop;
  //     expect(() =>
  //       rp.callbackRemote(
  //         dict,
  //         post,
  //         RPCAsyncType.promise,
  //         'remote function',
  //         [],
  //       ),
  //     ).toThrowError();
  //   });

  // it('should register the last argument as a callback', () => {
  //   const dict: RPCAsyncContainerDictionary = {};
  //   const post = noop;
  //   const callback = noop;
  //   rp.callbackRemote(dict, post, 'nodeCallback', 'remote function', [
  //     'args',
  //     callback,
  //   ]);

  //   let found = false;

  //   /** tslint:disable-next-line:for-in */
  //   for (let i in dict) {
  //     if (dict[i].async === callback) {
  //       found = true;
  //     }
  //   }

  //   expect(found).toBe(true);
  // });
  // });

  describe('doPost function', () => {
    it('should call the given post method', () => {
      let isDone = false;
      const post = () => {
        isDone = true;
      };

      rp.doPost(() => 'some id', post, RPCEventType.invoke, 'remote', [
        'some',
        'args',
      ]);
    });
  });

  describe('promiseRemote function', () => {
    it('should register a new defer', () => {
      const dict: RPCAsyncContainerDictionary = {};
      const post = noop;
      rp.promiseRemote(
        () => 'some id',
        dict,
        post,
        RPCEventType.promise,
        RPCAsyncType.promise,
        'remote function',
        ['args'],
      );

      expectDeferIn(dict);
    });
  });

  describe('registerAsync function', () => {
    it('should add a defer to a dictionary', () => {
      const dict: RPCAsyncContainerDictionary = {};
      const d = defer();
      const id = 'test';
      rp.registerAsync(dict, d, RPCAsyncType.promise, id);

      expect(dict[id]).toBeTruthy();
    });

    it('should throw if registering the same uid', () => {
      const dict: RPCAsyncContainerDictionary = {};
      const d = defer();
      const id = 'test';
      rp.registerAsync(dict, d, RPCAsyncType.promise, id);

      expect(() =>
        rp.registerAsync(dict, d, RPCAsyncType.promise, id),
      ).toThrowError();
    });
  });
});

function expectDeferIn(dict) {
  let found;

  /* tslint:disable:for-in */
  for (let i in dict) {
    if (!dict[i].async) {
      break;
    }
    if (isDefer(dict[i].async)) {
      found = dict[i].async;
    }
  }

  expect(found).toBeTruthy();
}

function expectFunctionIn(dict) {
  let found;

  /* tslint:disable:for-in */
  for (let i in dict) {
    if (!dict[i].async) {
      break;
    }
    if (isFunction(dict[i].async)) {
      found = dict[i].async;
    }
  }

  expect(found).toBeTruthy();
}
