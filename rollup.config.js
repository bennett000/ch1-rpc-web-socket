import nodeResolve from 'rollup-plugin-node-resolve';

export default [
  {
    input: 'dist/expose-tests.js',
    output: {
      file: 'intermediate/test.js',
      format: 'iife',
      sourcemap: true,
    },
    plugins: [nodeResolve({ jsnext: true })],
  },
  {
    input: 'dist/index.js',
    output: {
      file: 'intermediate/rpc-web-socket.js',
      format: 'cjs',
      sourcemap: true,
    },
    plugins: [nodeResolve({ jsnext: true })],
  },
];
