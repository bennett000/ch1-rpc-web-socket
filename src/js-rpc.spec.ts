import * as rpc from './js-rpc';
import { DEFAULT_MESSAGE } from './constants';
import { noop } from './utils';

describe('js-rpc functions', () => {
  let config;

  beforeEach(() => {
    config = {
      emit: noop,
      enableStackTrace: false,
      message: '',
      on: noop,
      remote: {},
    };
  });

  describe('create function', () => {
    it('should run without incident if given valid parameters', () => {
      expect(() => rpc.create<Object>(config, {})).not.toThrowError();
    });

    it('should provide a destroy function', () => {
      const test = rpc.create<Object>(config, {});
      expect(() => test.destroy()).not.toThrowError();
    });
  });

  describe('validateRemote function', () => {
    it('should resolve if a given value is falsey', () => {
      expect(() => rpc.validateRemote(null)).not.toThrowError();
    });

    it('should throw if given value is truthy and also not an object', () => {
      expect(() => rpc.validateRemote('hello')).toThrowError();
    });

    it('should not throw if given a valid object', () => {
      expect(() => rpc.validateRemote({})).not.toThrowError();
    });
  });

  describe('validateConfig function', () => {
    it('should return an immutable (frozen) object', () => {
      const validConfig = rpc.validateConfig(config, {});

      expect(() => (validConfig.message = 'test')).toThrowError();
    });

    it('should default to having a false stack prop', () => {
      config.enableStackTrace = '';
      const validConfig = rpc.validateConfig(config, {});

      expect(validConfig.enableStackTrace).toBe(false);
    });

    it('should default to using DEFAULT_MESSAGE', () => {
      config.message = '';
      const validConfig = rpc.validateConfig(config, {});

      expect(validConfig.message).toBe(DEFAULT_MESSAGE);
    });
  });
});

describe('basic async e2e', () => {
  let configA;
  let configB;
  let callbacksA;
  let callbacksB;

  beforeEach(() => {
    callbacksA = [];
    callbacksB = [];

    configA = {
      emit: (...args) => {
        setTimeout(() => {
          callbacksB.filter(Boolean).forEach(cb => cb.apply(null, args));
        }, 0);
      },
      enableStackTrace: false,
      message: '',
      on: listener => {
        const offset = callbacksA.push(listener);
        return () => {
          callbacksA[offset - 1] = null;
        };
      },
      remote: {},
    };

    configB = {
      emit: (...args) => {
        setTimeout(() => {
          callbacksA.filter(Boolean).forEach(cb => cb.apply(null, args));
        }, 0);
      },
      enableStackTrace: false,
      message: '',
      on: listener => {
        const offset = callbacksB.push(listener);
        return () => {
          callbacksB[offset - 1] = null;
        };
      },
      remote: {},
    };
  });

  it('should work for two simple functions', done => {
    interface Test1 {
      test1(): string;
    }

    interface Test2 {
      test2(): string;
    }

    const a = rpc.create<Test2>(configA, {
      test1: () => new Promise(resolve => resolve('testA')),
    });

    const b = rpc.create<Test1>(configB, {
      test2: () => new Promise(resolve => resolve('testB')),
    });

    Promise.all([a.ready, b.ready])
      .then(() => {
        return Promise.all([a.remote.test2(), b.remote.test1()]).then(
          results => {
            expect(results[0]).toBe('testB');
            expect(results[1]).toBe('testA');
          },
        );
      })
      .catch(err => {
        expect(err.message).toBeUndefined();
      })
      .then(() => {
        a.destroy();
        b.destroy();
        done();
      });
  });
});
