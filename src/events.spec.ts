import * as events from './events';
import { noop } from './utils';

describe('event functions', () => {
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

  describe('createErrorEvent function', () => {
    it('should run create a serializable error', () => {
      const event = events.createErrorEvent(config, 3, new Error('test'));

      expect(typeof JSON.stringify(event)).toBe('string');
    });
  });
});
