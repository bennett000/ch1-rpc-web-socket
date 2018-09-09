const TEST_FILE = '/base/intermediate/test-worker.js';

const wrpc = window.TEST_RPC;
const noop = () => {};

describe('web socket rpc functions', () => {
  describe('e2e function', () => {
    it('should invoke a web socket function', done => {
      const ws = new WebSocket('ws://localhost:5151');
      const rpc = wrpc.create({ socket: ws });
      ws.addEventListener('error', done);

      rpc.ready
        .then(() => rpc.remote.foo())
        .then(result => {
          expect(result).toBe(7);
          ws.close();
          done();
        })
        .catch(done);
    });
  });
});
