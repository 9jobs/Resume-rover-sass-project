import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
export default {
  serverExternalPackages: ['@sparticuz/chromium', '@libsql/client', 'puppeteer-core'],
  outputFileTracingIncludes: {
    '/api/*': [
      './features/turso-worker.mjs',
      './node_modules/@libsql/client/**/*',
      './node_modules/@libsql/core/**/*',
      './node_modules/@libsql/hrana-client/**/*',
      './node_modules/@libsql/isomorphic-ws/**/*',
      './node_modules/js-base64/**/*',
      './node_modules/promise-limit/**/*',
      './node_modules/ws/**/*',
      './node_modules/@sparticuz/chromium/bin/**/*',
      './node_modules/pdfjs-dist/legacy/build/pdf.mjs',
      './node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs',
      './node_modules/pdfjs-dist/package.json',
      './node_modules/@napi-rs/canvas/**/*',
      './node_modules/@napi-rs/canvas-linux-x64-gnu/**/*',
      './node_modules/@fontsource/arimo/files/arimo-latin-*-normal.woff',
      './node_modules/@fontsource/tinos/files/tinos-latin-*-normal.woff',
      './node_modules/@fontsource/carlito/files/carlito-latin-*-normal.woff',
    ],
  },
  async rewrites() {
    return [
      { source: '/', destination: '/index.html' },
      ...['features', 'templates', 'how-it-works', 'ats-demo', 'career-roles', 'pricing', 'faq'].map(page => ({
        source: '/' + page,
        destination: '/index.html',
      })),
    ];
  },
  webpack(config) {
    config.resolve.alias['@clerk/nextjs$'] = path.join(root, 'adapters/clerk-local.jsx');
    return config;
  },
};
