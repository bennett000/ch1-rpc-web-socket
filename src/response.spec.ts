import * as nOp from './response';
import { defer } from './utils';
import { RPCEventType, RPCAsyncType } from './interfaces';

import { isRPCErrorPayload, isRPCReturnPayload, noop } from './utils';

describe('network over post functions', () => {
  let config;
  let event;

  beforeEach(() => {
    config = {
      emit: noop,
      enableStackTrace: false,
      functionalState: nOp.bootstrap({
        responders: {},
        successHandlers: {},
        errorHandlers: {},
      }),
      message: '',
      on: () => noop,
      remote: {},
      uid: () => 'some id',
    };

    event = {
      payload: {
        result: [],
      },
      type: RPCEventType.fnReturn,
      uid: 'test',
    };
  });

  describe('ack function', () => {
    it('should throw if useAcks is false', () => {
      expect(() => nOp.ack(config, event)).toThrowError();
    });

    it("should throw if it gets an ack it's not expecting", () => {
      config.useAcks = {};
      expect(() => nOp.ack(config, event)).toThrowError();
    });

    it("should throw if it gets an payload it's not expecting", () => {
      config.useAcks = {};
      event.payload = {
        error: {
          message: 'test',
        },
      };
      expect(() => nOp.ack(config, event)).toThrowError();
    });

    it('should clean the timeout waiting', () => {
      event.payload.result.push('test');
      config.useAcks = { test: 12345 };
      nOp.ack(config, event);

      expect(config.useAcks.test).toBeUndefined();
    });
  });

  describe('invoke function', () => {
    it('should emit an error', () => {
      config.remote = {};

      config.emit = arg => {
        expect(isRPCErrorPayload(arg.payload)).toBe(true);
      };

      nOp.invoke(config, { error: { message: 'hi' } }, 'testId');
    });

    it('should emit RPCReturnPayloads if the function passes', () => {
      let result;

      config.remote = {
        test: arg => (result = arg),
      };

      config.emit = arg => {
        expect(isRPCReturnPayload(arg.payload)).toBe(true);
      };

      nOp.invoke(config, { fn: 'test', args: [1] }, 'testId');

      expect(result).toBe(1);
    });

    it('should emit RPCErrorPayload if the function fails', () => {
      // trigger an error by wiping remotes
      config.remote = {};

      config.emit = arg => {
        expect(isRPCErrorPayload(arg.payload)).toBe(true);
      };

      nOp.invoke(config, { fn: 'test', args: [1] }, 'testId');
    });
  });

  // describe('on function', () => {
  //   it('should not sendAcks by default', () => {
  //     let didRun = false;
  //     let emit;
  //     config.on = trigger => {
  //       emit = trigger;
  //     };
  //     const sendAck = (c, uid) => {
  //       didRun = true;
  //     };

  //     nOp.on(
  //       sendAck,
  //       config,
  //       {
  //         test: { async: noop, type: 'nodeCallback' },
  //       },
  //       'id',
  //     );

  //     emit(event);

  //     expect(didRun).toBe(false);
  //   });

  //   it('should sendAcks if useAcks is true *and* the event is not an ack', () => {
  //     let didRun = true;
  //     let emit;
  //     config.on = trigger => {
  //       emit = trigger;
  //     };
  //     config.useAcks = Object.create(null);
  //     const sendAck = (c, uid) => {
  //       didRun = true;
  //     };

  //     nOp.on(
  //       sendAck,
  //       config,
  //       {
  //         test: { async: noop, type: 'nodeCallback' },
  //       },
  //       'id',
  //     );

  //     emit(event);

  //     expect(didRun).toBe(true);
  //   });
  // });

  describe('fireError function', () => {
    it('should be able to process defers', done => {
      const d = defer();

      event.payload = { error: { message: 'test' } };
      nOp.fireError(config, event.payload, {
        async: d,
        type: RPCAsyncType.promise,
      });

      d.promise
        .then(result => {
          expect(result).toBe('this should not happen');
          done();
        })
        .catch(error => {
          expect(error instanceof Error).toBe(true);
          done();
        });
    });

    // it('should be able to process callbacks', () => {
    //   let err;

    //   event.payload = { error: { message: 'test' } };
    //   nOp.fireError(config, event.payload, {
    //     async: error => {
    //       err = error;
    //     },
    //     type: 'nodeCallback',
    //   });

    //   expect(err instanceof Error).toBe(true);
    // });

    it('should throw if given async is invalid', () => {
      event.payload = { error: { message: 'uh oh' } };

      expect(() =>
        nOp.fireError(config, event.payload, <any>{ iDoNothing: () => {} }),
      ).toThrowError();
    });
  });

  describe('fireSuccess function', () => {
    it('should be able to process defers', done => {
      const d = defer();
      event.payload.result.push(true);
      nOp.fireSuccess(config, event.payload, {
        async: d,
        type: RPCAsyncType.promise,
      });

      d.promise
        .then(result => {
          expect(result).toBe(true);
          done();
        })
        .catch(error => {
          expect(error.message).toBeUndefined();
          done();
        });
    });

    it('should throw if given async is invalid', () => {
      event.payload = { 'something else': noop };

      expect(() =>
        nOp.fireSuccess(config, event.payload, <any>{ iDoNothing: () => {} }),
      ).toThrowError();
    });

    // it('should be able to process callbacks', () => {
    //   let res;
    //   event.payload.result.push(true);
    //   nOp.fireSuccess(config, event.payload, {
    //     async: (err, result) => {
    //       res = result;
    //     },
    //     type: 'nodeCallback',
    //   });

    //   expect(res).toBeTruthy();
    // });
  });

  describe('createInitializationState', () => {
    it('should have a working defer', done => {
      const state = nOp.createInitializationState(config, {}, 'testId');
      state.defer.promise.then(test => {
        expect(test).toBe('testing');
        done();
      });
      state.defer.resolve('testing');
    });

    it('should time out if its defer is not satisfied', done => {
      config.defaultCreateWait = 5;
      const state = nOp.createInitializationState(config, {}, 'testId');
      state.defer.promise.catch(err => {
        expect(err instanceof Error).toBe(true);
        done();
      });
    });

    it('clean should stop timeouts from happening', done => {
      config.defaultCreateWait = 5;
      const state = nOp.createInitializationState(config, {}, 'testId');
      let didErr = false;

      state.defer.promise.catch(err => {
        expect(err.message).toBeUndefined();
        didErr = true;
      });

      state.clean();

      setTimeout(() => {
        done();
        expect(didErr).toBe(false);
      }, config.defaultCreateWait * 2);
    });

    // these two tests are not running with jest

    // it('should repeatedly fire create messages', done => {
    //   let emitCount = 0;
    //   config.defaultCreateRetry = 1;
    //   config.emit = evt => {
    //     expect(evt.type).toBe('create');
    //     emitCount += 1;
    //   };
    //   nOp.createInitializationState(config, {}, 'testId');

    //   setTimeout(() => {
    //     // timers are imperfect, ensure two ticks only
    //     expect(emitCount).toBeGreaterThan(1);
    //     done();
    //   }, 50);
    // });

    // it('stopCreateSpam should clear create messages', done => {
    //   let emitCount = 0;
    //   config.defaultCreateRetry = 1;
    //   config.emit = evt => (emitCount += 1);
    //   const state = nOp.createInitializationState(config, {}, 'testId');

    //   state.stopCreateSpam();
    //   setTimeout(() => {
    //     expect(emitCount).toBe(0);
    //     done();
    //   }, 10);
    // });
  });

  describe('initialize function', () => {
    let init;
    let initState;

    function resetState() {
      config.on = callback => {
        init = callback;
      };
      initState = {
        clean: () => {},
        defer: defer(),
        stopCreateSpam: () => {},
      };
    }

    beforeEach(() => {
      resetState();
      nOp.initialize(config, initState);
    });

    it('should throw if given an error payload', () => {
      expect(() =>
        init({
          uid: 'test',
          payload: {
            error: { message: 'test-error' },
          },
        }),
      ).toThrowError('test-error');
    });

    it('should throw if given an non RPCReturnPayload', () => {
      expect(() =>
        init({
          uid: 'test',
          invoke: {
            fn: 'test',
            args: [],
          },
        }),
      ).toThrowError();
    });

    it('should throw if not given a create or createReturn event', () => {
      expect(() =>
        init({
          uid: 'test',
          type: RPCEventType.promise,
          payload: {
            result: [],
          },
        }),
      ).toThrowError();
    });

    describe('create event', () => {
      it('should setLocalRemote state if create is called', () => {
        init({
          uid: 'test',
          type: RPCEventType.create,
          payload: {
            result: [{ test: 'object' }],
          },
        });
        expect(initState.localRemoteDesc).toBeTruthy();
        expect(initState.localRemoteDesc.test).toBeTruthy();
        expect(initState.localRemoteDesc.test).toBe('object');
      });

      it('should set hasCreated', () => {
        init({
          uid: 'test',
          type: RPCEventType.create,
          payload: { result: [] },
        });
        expect(initState.hasCreated).toBe(true);
      });

      it('should set hasCreated only once', () => {
        init({
          uid: 'test',
          type: RPCEventType.create,
          payload: {
            result: ['test'],
          },
        });
        expect(initState.localRemoteDesc).toBe('test');
        initState.localRemoteDesc = 'something else';
        init({
          uid: 'test',
          type: RPCEventType.create,
          payload: {
            result: ['test'],
          },
        });
        expect(initState.localRemoteDesc).toBe('something else');
      });

      it('should emit a createReturn event', () => {
        let evt;
        config.emit = e => {
          evt = e;
        };
        init({
          uid: 'test',
          type: RPCEventType.create,
          payload: { result: [] },
        });
        expect(evt.type).toBe(RPCEventType.createReturn);
      });
    });

    describe('createReturn event', () => {
      it('should set isCreated', () => {
        init({
          uid: 'test',
          type: RPCEventType.createReturn,
          payload: { result: [] },
        });
        expect(initState.isCreated).toBe(true);
      });

      it('should set isCreated only once', () => {
        let callCount = 0;
        initState.stopCreateSpam = () => callCount++;
        init({
          uid: 'test',
          type: RPCEventType.createReturn,
          payload: { result: [] },
        });
        expect(callCount).toBe(1);
        init({
          uid: 'test',
          type: RPCEventType.createReturn,
          payload: { result: [] },
        });
        expect(callCount).toBe(1);
      });

      it('should stopCreateSpam', () => {
        spyOn(initState, 'stopCreateSpam');
        init({
          uid: 'test',
          type: RPCEventType.createReturn,
          payload: { result: [] },
        });
        expect(initState.stopCreateSpam).toHaveBeenCalled();
      });
    });

    describe('detect completing', () => {
      let isCleaned;

      beforeEach(() => {
        resetState();
        isCleaned = false;

        config.on = callback => {
          init = callback;
          return () => {
            isCleaned = true;
          };
        };

        nOp.initialize(config, initState);
      });

      it('should clean its listeners', () => {
        initState.hasCreated = true;
        init({
          uid: 'test',
          type: RPCEventType.createReturn,
          payload: { result: [] },
        });
        expect(initState.isCreated).toBe(true);
      });

      it('should clean its state', () => {
        initState.isCreated = true;
        spyOn(initState, 'clean');
        init({
          uid: 'test',
          type: RPCEventType.create,
          payload: { result: [] },
        });
        expect(initState.clean).toHaveBeenCalled();
      });

      it("should resolve state's defer with the localRemoteDesc", done => {
        initState.hasCreated = true;
        initState.localRemoteDesc = 'test-it!';
        init({
          uid: 'test',
          type: RPCEventType.createReturn,
          payload: { result: [] },
        });
        initState.defer.promise.then(lrd => {
          expect(lrd).toBe('test-it!');
          done();
        });
      });
    });
  });

  // describe('nodeCallback', () => {
  //   it('should emit an error', () => {
  //     config.remote = {};

  //     config.emit = arg => {
  //       expect(isRPCErrorPayload(arg.payload)).toBe(true);
  //     };

  //     nOp.nodeCallback(config, { error: { message: 'hi' } }, 'testId');
  //   });

  //   it('should emit RPCErrorPayload if the function fails', () => {
  //     // trigger an error by wiping remotes
  //     config.remote = {
  //       test: () => {
  //         throw new Error('test');
  //       },
  //     };

  //     config.emit = arg => {
  //       expect(isRPCErrorPayload(arg.payload)).toBe(true);
  //     };

  //     nOp.nodeCallback(config, { fn: 'test', args: [1] }, 'testId');
  //   });

  //   it('should emit RPCReturnPayloads if the function passes', () => {
  //     config.remote = {
  //       test: (arg, callback) => {
  //         callback(null, 'test-this');
  //       },
  //     };

  //     config.emit = arg => {
  //       if (arg.type !== 'nodeCallback') {
  //         return;
  //       }
  //       expect(isRPCReturnPayload(arg.payload)).toBe(true);
  //       expect(arg.payload.result[0]).toBe('test-this');
  //     };

  //     nOp.nodeCallback(config, { fn: 'test', args: [1] }, 'testId');
  //   });

  //   it('should emit RPCErrorPayload if the function fails', () => {
  //     // trigger an error by wiping remotes
  //     config.remote = {
  //       test: (arg, callback) => callback(new Error('test')),
  //     };

  //     config.emit = arg => {
  //       if (arg.type !== 'nodeCallback') {
  //         return;
  //       }
  //       expect(isRPCErrorPayload(arg.payload)).toBe(true);
  //     };

  //     nOp.nodeCallback(config, { fn: 'test', args: [1] }, 'testId');
  //   });
  // });

  describe('promise', () => {
    it('should emit an error', () => {
      config.remote = {};

      config.emit = arg => {
        expect(isRPCErrorPayload(arg.payload)).toBe(true);
      };

      nOp.promise(config, { error: { message: 'hi' } }, 'testId');
    });

    it('should emit RPCErrorPayload if the function fails', () => {
      // trigger an error by wiping remotes
      config.remote = {
        test: () => {
          throw new Error('test');
        },
      };

      config.emit = arg => {
        expect(isRPCErrorPayload(arg.payload)).toBe(true);
      };

      nOp.promise(config, { fn: 'test', args: [1] }, 'testId');
    });

    it('should emit RPCReturnPayloads if the function passes', () => {
      config.remote = {
        test: (arg, callback) => new Promise(resolve => resolve('test-this')),
      };

      config.emit = arg => {
        if (arg.type !== RPCAsyncType.promise) {
          return;
        }
        expect(isRPCReturnPayload(arg.payload)).toBe(true);
        expect(arg.payload.result[0]).toBe('test-this');
      };

      nOp.promise(config, { fn: 'test', args: [1] }, 'testId');
    });

    it('should emit RPCErrorPayload if the function fails', () => {
      // trigger an error by wiping remotes
      config.remote = {
        test: (arg, callback) =>
          new Promise((resolve, reject) => reject(new Error('test-this'))),
      };

      config.emit = arg => {
        if (arg.type !== 'nodeCallback') {
          return;
        }
        expect(isRPCErrorPayload(arg.payload)).toBe(true);
      };

      nOp.promise(config, { fn: 'test', args: [1] }, 'testId');
    });
  });

  describe('returnPayload function', () => {
    it('should throw an error if a callback is missing', () => {
      expect(() =>
        nOp.returnPayload(config, event.payload, {}, 'test'),
      ).toThrowError();
    });

    // it('should throw an error if a payload is unexpected', () => {
    //   event.payload = {};
    //   expect(() =>
    //     nOp.returnPayload(
    //       config,
    //       event.payload,
    //       {
    //         test: { async: noop, type: 'nodeCallback' },
    //       },
    //       'test',
    //     ),
    //   ).toThrowError();
    // });

    // it('should delete callbacks if it processes an error', () => {
    //   const callbacks: RPCAsyncContainerDictionary = {
    //     test: { async: noop, type: 'nodeCallback' },
    //   };

    //   event.payload = { error: { message: 'test' } };

    //   nOp.returnPayload(config, event.payload, callbacks, 'test');

    //   /* tslint:disable no-string-literal */
    //   const test: any = <any>callbacks['test'];

    //   expect(test).toBeUndefined();
    // });

    // it('should delete callbacks if it processes a return value', () => {
    //   const callbacks: RPCAsyncContainerDictionary = {
    //     test: { async: noop, type: 'nodeCallback' },
    //   };

    //   nOp.returnPayload(config, event.payload, callbacks, 'test');

    //   /* tslint:disable no-string-literal */
    //   const test: any = <any>callbacks['test'];

    //   expect(test).toBeUndefined();
    // });
  });

  describe('sendAck', () => {
    it('should emit an RPCResultPayload with the given uid', () => {
      let evt;
      config.emit = e => (evt = e);

      nOp.sendAck(config, 'test-uid');
      expect(evt.payload.result[0]).toBe('test-uid');
    });
  });
});
