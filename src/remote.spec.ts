import * as remote from './remote';
import { noop } from './utils';

describe('Remote Object functions', () => {
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

      expect(remote.getFinalFunction(test, 'myNamespace.myFunction'))
        .toBe(finalFunction);
    });
    
    it('should resolve a "third level" case', () => {
      const finalFunction = noop;
      const test = {
        myNamespace: { 
          nestedNS: { myFunction: finalFunction },
        },
      };

      expect(remote.getFinalFunction(test, 'myNamespace.nestedNS.myFunction'))
        .toBe(finalFunction);
    });
    
    it('should return an Error if given invalid input', () => {
      const finalFunction = noop;
      const test = { myFunction: finalFunction };

      expect(remote.getFinalFunction(test, '') instanceof Error).toBe(true);
    });

    it('should return an error if given an invalid sub object / namespace',
      () => {
        const finalFunction = noop;
        const test = {
          myNamespace: { myFunction: finalFunction },
        };
        const expectedError = remote.getFinalFunction(test, 'ooga.myFunction');

        expect(expectedError instanceof Error).toBe(true);
      });
    
    it('should return an error if given an invalid function',
      () => {
        const test = {
          myNamespace: { myFunction: 'not a function' },
        };
        const expectedError = remote
          .getFinalFunction(test, 'myNamespace.myFunction');

        expect(expectedError instanceof Error).toBe(true);
      });
  });

  describe('safeCall function', () => {
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
    
    it('should return an error if there is no final function', () => {
      const result = remote.safeCall(config, 'something');
      
      expect(result instanceof Error).toBe(true);
    });
    
    it('should call the remote function with given arguments', () => {
      let result = 0;
      config.remote = {
        test: (val) => { result += val; }
      };
      
      remote.safeCall(config, 'test', [5]);
      
      expect(result).toBe(5);
    });
    
    it('should return an error if the remote function throws', () => {
      config.remote = {
        test: (val) => { throw new Error('test'); }
      };

      const result = remote.safeCall(config, 'test', [5]);

      expect(result instanceof Error).toBe(true);
    });
  });
});
