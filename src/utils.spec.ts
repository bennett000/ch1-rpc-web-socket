import * as utils from './utils';
import { RPCEventType } from './interfaces';

describe('utils functions', () => {
  const resolver = (resolve, reject) => {};

  describe('createNewFunctionFrom', () => {
    it(
      'should create a new function, the `new Function` way, but from a ' +
        'given function',
      () => {
        const test1 = function t1(a, b, c) {
          return a + b + c;
        };
        const newFunc = utils.createNewFunctionFrom(test1);
        expect(newFunc instanceof Function).toBe(true);
      },
    );

    it('newly created functions should be distinct', () => {
      function test2(a, b, c) {
        return a + b + c;
      }
      const newFuncA = utils.createNewFunctionFrom(test2);
      const newFuncB = utils.createNewFunctionFrom(test2);
      expect(newFuncA).not.toBe(newFuncB);
    });
  });

  describe('defer function', () => {
    it('should return a defer with a working resolve', done => {
      const d = utils.defer();

      d.promise
        .then(val => {
          expect(val).toBe('test');
          done();
        })
        .catch(err => {
          expect(err.message).toBe(undefined);
          done();
        });

      d.resolve('test');
    });

    it('should return a defer with a working reject', done => {
      const d = utils.defer();

      d.promise
        .then(val => {
          expect(val).toBe('this should not run');
          done();
        })
        .catch(err => {
          expect(err.message).toBe('test');
          done();
        });

      d.reject(new Error('test'));
    });
  });

  describe('isDefer function', () => {
    it('should return false if given nothing', () => {
      expect(utils.isDefer(null)).toBe(false);
    });

    it('should return false if given a defer without a reject', () => {
      const p = { resolve: utils.noop, promise: new Promise(resolver) };
      expect(utils.isDefer(p)).toBe(false);
    });

    it('should return false if given a defer without a resolve', () => {
      const p = { reject: utils.noop, promise: new Promise(resolver) };
      expect(utils.isDefer(p)).toBe(false);
    });

    it('should return false if given a defer without a promise', () => {
      const p = { reject: utils.noop, resolve: utils.noop };
      expect(utils.isDefer(p)).toBe(false);
    });

    it('should return true if given a defer', () => {
      expect(utils.isDefer(utils.defer())).toBe(true);
    });
  });

  describe('isError', () => {
    it('should type check for an error', () => {
      expect(utils.isError(new Error())).toBe(true);
      expect(utils.isError(5)).toBe(false);
    });
  });

  describe('isRPCEvent', () => {
    it('should type check for an rpc event', () => {
      expect(
        utils.isRPCEvent({
          type: RPCEventType.invoke,
          uid: 'test',
          payload: { error: { message: 'test' } },
        }),
      ).toBe(true);
      expect(
        utils.isRPCEvent({
          type: false,
          uid: 'test',
          payload: { error: { message: 'test' } },
        }),
      ).toBe(false);
      expect(
        utils.isRPCEvent({
          type: RPCEventType.invoke,
          uid: 'test',
          payload: { error: 'fakes' },
        }),
      ).toBe(false);
      expect(
        utils.isRPCEvent({
          type: RPCEventType.invoke,
          uid: 'test',
          payload: { result: 'seven' },
        }),
      ).toBe(false);
      expect(utils.isRPCEvent(null)).toBe(false);
      expect(utils.isRPCEvent(5)).toBe(false);
    });
  });

  describe('isRPCError', () => {
    it('should type check for an rpc error', () => {
      expect(utils.isRPCError({ message: 'test' })).toBe(true);
      expect(utils.isRPCError(null)).toBe(false);
      expect(utils.isRPCError(5)).toBe(false);
    });
  });

  describe('isRPCErrorPayload', () => {
    it('should type check for an error payload', () => {
      expect(utils.isRPCErrorPayload({ error: { message: 'test' } })).toBe(
        true,
      );
      expect(utils.isRPCErrorPayload(null)).toBe(false);
      expect(utils.isRPCErrorPayload(5)).toBe(false);
    });
  });

  describe('isRPCInvocationPayload', () => {
    it('should type check for a return payload', () => {
      expect(utils.isRPCInvocationPayload({ fn: 'thing', args: [] })).toBe(
        true,
      );
      expect(utils.isRPCInvocationPayload({ fn: 7, args: [] })).toBe(false);
      expect(utils.isRPCInvocationPayload(null)).toBe(false);
      expect(utils.isRPCInvocationPayload(5)).toBe(false);
    });
  });

  describe('isRPCReturnPayload', () => {
    it('should type check for a return payload', () => {
      expect(utils.isRPCReturnPayload({ result: [] })).toBe(true);
      expect(utils.isRPCReturnPayload(null)).toBe(false);
      expect(utils.isRPCReturnPayload(5)).toBe(false);
    });
  });

  describe('isFunction', () => {
    it('should type check for a function', () => {
      expect(utils.isFunction(utils.noop)).toBe(true);
      expect(utils.isFunction(5)).toBe(false);
    });
  });

  describe('isString', () => {
    it('should type check for a string', () => {
      expect(utils.isString(utils.noop)).toBe(false);
      expect(utils.isString('word')).toBe(true);
    });
  });

  describe('isObject function', () => {
    it('should return false if given a falsey value', () => {
      expect(utils.isObject(null)).toBe(false);
    });

    it('should return false if a given value is not an object', () => {
      expect(utils.isObject(57)).toBe(false);
      expect(utils.isObject('hello')).toBe(false);
    });

    it('should return true if given an object created from null', () => {
      expect(utils.isObject(Object.create(null))).toBe(true);
    });

    it('should return true if given a "normal" object', () => {
      expect(utils.isObject({})).toBe(true);
    });
  });

  describe('isPromise function', () => {
    it('should return false if given nothing', () => {
      expect(utils.isPromise(null)).toBe(false);
    });

    it('should return false if not given a promise', () => {
      expect(utils.isPromise({})).toBe(false);
    });

    it('should return false if not given a promise with a catch', () => {
      expect(utils.isPromise({ then: utils.noop })).toBe(false);
    });

    it('should return true if given a promise', () => {
      expect(utils.isPromise(new Promise(resolver))).toBe(true);
    });
  });

  describe('noop function', () => {
    it('there should be a noop function', () => {
      expect(() => utils.noop()).not.toThrow();
    });
  });

  describe('throwIfNotFunction function', () => {
    it('should throw if given a non function', () => {
      expect(() => utils.throwIfNotFunction({})).toThrowError();
    });

    it('should optionally forward custom messages', () => {
      expect(() => utils.throwIfNotFunction({}, 'test')).toThrowError(
        /.*test.*/,
      );
    });

    it('should *not* throw if given a function', () => {
      expect(() => utils.throwIfNotFunction(utils.noop)).not.toThrowError();
    });
  });

  describe('throwIfNotError function', () => {
    it('should throw if given a non function', () => {
      expect(() => utils.throwIfNotError({})).toThrowError();
    });

    it('should optionally forward custom messages', () => {
      expect(() => utils.throwIfNotError({}, 'test')).toThrowError(
        /.*test.*/,
      );
    });

    it('should *not* throw if given an error', () => {
      expect(() => utils.throwIfNotError(new Error())).not.toThrowError();
    });
  });

  describe('throwIfNotObject function', () => {
    it('should throw if given a non function', () => {
      expect(() => utils.throwIfNotObject(utils.noop)).toThrowError();
    });

    it('should optionally forward custom messages', () => {
      expect(() => utils.throwIfNotObject(utils.noop, 'test')).toThrowError(
        /.*test.*/,
      );
    });

    it('should *not* throw if given a function', () => {
      expect(() => utils.throwIfNotObject({})).not.toThrowError();
    });
  });

  describe('throwIfNotRPCEvent function', () => {
    it('should throw if given a non RPCEvent', () => {
      expect(() => utils.throwIfNotRPCEvent({})).toThrowError();
    });

    it('should optionally forward custom messages', () => {
      expect(() => utils.throwIfNotRPCEvent({}, 'test')).toThrowError(
        /.*test.*/,
      );
    });

    it('should *not* throw if given an RPCEvent', () => {
      expect(() =>
        utils.throwIfNotRPCEvent({
          type: RPCEventType.invoke,
          payload: {
            error: {
              message: 'test',
            },
          },
          uid: 'test',
        }),
      ).not.toThrowError();
    });
  });

  describe('throwIfNotDefer function', () => {
    it('should throw if given a non function', () => {
      expect(() => utils.throwIfNotDefer({})).toThrowError();
    });

    it('should optionally forward custom messages', () => {
      expect(() => utils.throwIfNotDefer({}, 'test')).toThrowError(
        /.*test.*/,
      );
    });

    it('should *not* throw if given a defer', () => {
      expect(() => utils.throwIfNotDefer(utils.defer())).not.toThrowError();
    });
  });

  describe('typeError', () => {
    it('should throw a TypeError', () => {
      expect(() => utils.typeError('message')).toThrowError(/.*message.*/);
    });
  });

  describe('rangeError', () => {
    it('should throw a RangeError', () => {
      expect(() => utils.rangeError('message')).toThrowError(/.*message.*/);
    });
  });

  describe('safeInstantiate', () => {
    it('should instantiate a constructor with given arguments', () => {
      expect(utils.safeInstantiate(Error, []) instanceof Error).toBe(true);
      expect(utils.safeInstantiate(Error, ['test']).message).toBe('test');
    });

    it('should return an error if constructor throws', () => {
      function Test() {
        throw new EvalError('what?');
      }
      expect(utils.safeInstantiate(Test, ['test']) instanceof EvalError).toBe(
        true,
      );
    });
  });

  describe('safeInvoke', () => {
    it('should call a function with given arguments', () => {
      const test = (a, b) => a + b;
      expect(utils.safeInvoke(test, [3, 2])).toBe(5);
    });

    it('should return an Error if the function fails', () => {
      const test = () => {
        throw new TypeError('test');
      };
      expect(utils.safeInvoke(test, []) instanceof Error).toBe(true);
    });
  });
});
