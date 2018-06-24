import * as remote from './remote';
import { isFunction, noop } from './utils';

import {
  RPCAsyncContainerDictionary,
  RPCAsyncType,
  RemoteDesc,
} from './interfaces';

describe('Remote Object functions', () => {
  let config;

  beforeEach(() => {
    config = {
      emit: noop,
      enableStackTrace: false,
      message: '',
      on: () => noop,
      remote: {},
    };
  });

  describe('getFinalFunction function', () => {
    it('should resolve simple "first level" cases', () => {
      const finalFunction = noop;
      const test = { myFunction: finalFunction };

      expect(remote.getFinalFunction(test, 'myFunction')).toBe(finalFunction);
    });

    it('should resolve a "second level" case', () => {
      const finalFunction = noop;
      const test = {
        myNamespace: { myFunction: finalFunction },
      };

      expect(remote.getFinalFunction(test, 'myNamespace.myFunction')).toBe(
        finalFunction,
      );
    });

    it('should resolve a "third level" case', () => {
      const finalFunction = noop;
      const test = {
        myNamespace: {
          nestedNS: { myFunction: finalFunction },
        },
      };

      expect(
        remote.getFinalFunction(test, 'myNamespace.nestedNS.myFunction'),
      ).toBe(finalFunction);
    });

    it('should return an Error if given invalid input', () => {
      const finalFunction = noop;
      const test = { myFunction: finalFunction };

      expect(remote.getFinalFunction(test, '') instanceof Error).toBe(true);
    });

    it('should return an error if given an invalid sub object / namespace', () => {
      const finalFunction = noop;
      const test = {
        myNamespace: { myFunction: finalFunction },
      };
      const expectedError = remote.getFinalFunction(test, 'ooga.myFunction');

      expect(expectedError instanceof Error).toBe(true);
    });

    it('should return an error if given an invalid function', () => {
      const test = {
        myNamespace: { myFunction: 'not a function' },
      };
      const expectedError = remote.getFinalFunction(
        test,
        'myNamespace.myFunction',
      );

      expect(expectedError instanceof Error).toBe(true);
    });
  });

  describe('safeCall function', () => {
    it('should return an error if there is no final function', () => {
      const result = remote.safeCall(config, 'something');

      expect(result instanceof Error).toBe(true);
    });

    it('should call the remote function with given arguments', () => {
      let result = 0;
      config.remote = {
        test: val => {
          result += val;
        },
      };

      remote.safeCall(config, 'test', [5]);

      expect(result).toBe(5);
    });

    it('should return an error if the remote function throws', () => {
      config.remote = {
        test: val => {
          throw new Error('test');
        },
      };

      const result = remote.safeCall(config, 'test', [5]);

      expect(result instanceof Error).toBe(true);
    });
  });

  describe('create function', () => {
    beforeEach(() => {
      config.defaultAsyncType = RPCAsyncType.promise;
    });

    it('should map a simple remoteDesc to a new object', () => {
      interface Test {
        test1();
        test2();
      }

      debugger;

      const test = remote.create<Test>(
        config,
        {},
        {
          test1: RPCAsyncType.promise,
          // test2: 'nodeCallback',
        },
      );
      expect(isFunction(test.test1)).toBe(true);
      // expect(isFunction(test.test2)).toBe(true);
    });

    it('should skip unknown entries', () => {
      interface Test {
        test1();
        test2();
        test3?: void;
      }

      const callbacks: RPCAsyncContainerDictionary = {};

      const remoteDesc: RemoteDesc = {
        test1: RPCAsyncType.promise,
        // test2: 'nodeCallback',
        test3: 'mwhahaha' as any,
      };

      const test = remote.create<Test>(config, callbacks, remoteDesc);

      expect(test.test3).toBeUndefined();
    });

    it('should map a nested remoteDesc to a new object', () => {
      interface TestNest {
        test3();
      }

      interface Test {
        test1();
        test2();
        nest: TestNest;
      }

      const test = remote.create<Test>(
        config,
        {},
        {
          test1: RPCAsyncType.promise,
          test2: RPCAsyncType.promise,
          nest: {
            test3: RPCAsyncType.promise,
          },
        },
      );

      expect(isFunction(test.nest.test3)).toBe(true);
    });
  });

  describe('createRemoteDesc from', () => {
    beforeEach(() => {
      config.defaultAsyncType = RPCAsyncType.promise;
    });

    it('should build a desc using defaults', () => {
      const desc = remote.createRemoteDescFrom(config, {
        test1: noop,
        test2: noop,
      });

      expect(desc.test1).toBe(RPCAsyncType.promise);
      expect(desc.test2).toBe(RPCAsyncType.promise);
    });

    it('should build a nested desc using defaults', () => {
      const desc = remote.createRemoteDescFrom(config, {
        test1: noop,
        test2: noop,
        nest: {
          test3: noop,
        },
      });

      expect(desc.nest.test3).toBe(RPCAsyncType.promise);
    });

    it('should build a desc using specifics', () => {
      const desc = remote.createRemoteDescFrom(
        config,
        {
          test1: noop,
          test2: noop,
        },
        {
          test1: RPCAsyncType.promise,
        },
      );

      expect(desc.test1).toBe(RPCAsyncType.promise);
    });

    it('should build a nested desc using specifics', () => {
      const desc = remote.createRemoteDescFrom(
        config,
        {
          test1: noop,
          test2: noop,
          nest: {
            test3: noop,
          },
        },
        {
          nest: {
            test3: RPCAsyncType.promise,
          },
        },
      );

      expect(desc.nest.test3).toBe(RPCAsyncType.promise);
    });
  });
});
