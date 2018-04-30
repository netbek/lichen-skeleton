const path = require('path');
const {browserslist} = require('../../package.json');
const webpackConfig = require('../../webpack.config');
const rootPath = path.join(__dirname, '../../') + '/';

module.exports = {
  autoprefixer: {
    browsers: browserslist
  },
  css: {
    params: {
      includePaths: ['src/docs/css'],
      errLogToConsole: true
    }
  },
  lichen: {
    // Derivative images, rendered LaTeX, transpiled JS examples
    files: {
      src: {
        path: rootPath + 'files/'
      },
      dist: {
        // Development (editor) build
        dev: {
          path: rootPath + 'temp/files/',
          url: '/'
        },
        // Production build
        prod: {
          path: rootPath + 'files/',
          url: '/'
        }
      },
      temp: {
        path: rootPath + 'temp/'
      }
    },
    // Markdown content, YAML data, Nunjucks templates, rendered HTML
    pages: {
      src: {
        path: rootPath + 'src/docs/'
      },
      dist: {
        // Development (editor) build
        dev: {
          path: rootPath + 'temp/docs/',
          url: '/'
        },
        // Production build
        prod: {
          path: rootPath + 'docs/',
          url: '/'
        }
      }
    },
    remarkable: {
      rulesConfig: {
        image: {},
        responsiveImage: {
          sizes: '100vw', // '(min-width: 960px) 240px, 100vw',
          srcset: [
            {
              style: '600',
              width: 600
            },
            {
              style: '1200',
              width: 1200
            }
          ]
        }
      }
    },
    webpack: webpackConfig,
    hooks: []
  },
  penrose: {
    math: {
      ex: 12
    }
  },
  webserver: {
    host: 'localhost',
    port: 8000,
    path: '/',
    livereload: false,
    directoryListing: false,
    open: '/docs/',
    https: false,
    proxies: [
      {
        source: '/css/',
        target: 'http://localhost:8000/docs/css/'
      },
      {
        source: '/vendor/',
        target: 'http://localhost:8000/docs/vendor/'
      }
    ],
    fallback: 'docs/index.html', // For SPAs that manipulate browser history
    browsers: {
      default: 'firefox',
      darwin: 'google chrome',
      linux: 'google-chrome',
      win32: 'chrome'
    }
  }
};
