import nodeResolve from 'rollup-plugin-node-resolve';

export default [
  {
    input: 'dist/expose-tests.js',
    output: {
      file: 'intermediate/test.js',
      format: 'iife',
    },
    plugins: [nodeResolve({ jsnext: true })],
  },
  {
    input: 'dist/index.js',
    output: {
      file: 'intermediate/rpc-web-socket.js',
      format: 'cjs',
    },
    plugins: [nodeResolve({ jsnext: true })],
  },
];
