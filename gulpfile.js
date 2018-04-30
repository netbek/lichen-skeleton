const _ = require('lodash');
const autoprefixer = require('autoprefixer');
const fs = require('fs-extra');
const gulp = require('gulp');
const gulpConcat = require('gulp-concat');
const gulpCssmin = require('gulp-cssmin');
const gulpGhPages = require('gulp-gh-pages');
const gulpPostcss = require('gulp-postcss');
const gulpRename = require('gulp-rename');
const gulpSass = require('gulp-sass');
const {Lichen} = require('lichen');
const livereload = require('livereload');
const open = require('open');
const os = require('os');
const path = require('path');
const pkgDir = require('pkg-dir');
const Promise = require('bluebird');
const runSequence = require('run-sequence');
const webserver = require('gulp-webserver');

Promise.promisifyAll(fs);

/* -----------------------------------------------------------------------------
 * Config
 ---------------------------------------------------------------------------- */

const gulpConfig = require('./gulp/config');

const livereloadOpen =
  (gulpConfig.webserver.https ? 'https' : 'http') +
  '://' +
  gulpConfig.webserver.host +
  ':' +
  gulpConfig.webserver.port +
  (gulpConfig.webserver.open ? gulpConfig.webserver.open : '/');

const lichenConfig = {
  ...gulpConfig.lichen,
  imageStyles: gulpConfig.imageStyles,
  penrose: gulpConfig.penrose
};

/* -----------------------------------------------------------------------------
 * Misc
 ---------------------------------------------------------------------------- */

const flags = {
  livereloadInit: false // Whether `livereload-init` task has been run
};
let server;

// Choose browser for node-open.
let browser = gulpConfig.webserver.browsers.default;
const platform = os.platform();
if (_.has(gulpConfig.webserver.browsers, platform)) {
  browser = gulpConfig.webserver.browsers[platform];
}

const lichen = new Lichen(lichenConfig);

/* -----------------------------------------------------------------------------
 * Functions
 ---------------------------------------------------------------------------- */

/**
 *
 * @param   {string} src
 * @param   {string} dist
 * @param   {string} distName
 * @returns {Promise}
 */
function buildCss(src, dist, distName = 'app.css') {
  return new Promise(function(resolve, reject) {
    gulp
      .src(src)
      .pipe(gulpSass(gulpConfig.css.params).on('error', gulpSass.logError))
      .pipe(gulpPostcss([autoprefixer(gulpConfig.autoprefixer)]))
      .pipe(gulpConcat(distName))
      .pipe(gulp.dest(dist))
      .pipe(
        gulpCssmin({
          advanced: false
        })
      )
      .pipe(
        gulpRename({
          suffix: '.min'
        })
      )
      .pipe(gulp.dest(dist))
      .on('end', function() {
        resolve();
      });
  });
}

/**
 * Start a watcher.
 *
 * @param {Array} files
 * @param {Array} tasks
 * @param {boolean} livereload - Set to `true` to force livereload to refresh the page.
 */
function startWatch(files, tasks, livereload) {
  if (livereload) {
    tasks.push('livereload-reload');
  }

  gulp.watch(files, function() {
    runSequence(...tasks);
  });
}

/* -----------------------------------------------------------------------------
 * Tasks
 ---------------------------------------------------------------------------- */

gulp.task('deploy', function() {
  return gulp
    .src(path.join(gulpConfig.lichen.pages.dist.prod.path, '**/*'))
    .pipe(gulpGhPages());
});

gulp.task('build-docs', function(cb) {
  runSequence(
    'build-docs-clean',
    'build-docs-vendor',
    'build-docs-css',
    'build-docs-html',
    cb
  );
});

gulp.task('build-docs-clean', function() {
  return fs.emptyDirAsync('./docs');
});

gulp.task('build-docs-css', function() {
  return buildCss(
    path.join(gulpConfig.lichen.pages.src.path, 'css/**/*.scss'),
    path.join(gulpConfig.lichen.pages.dist.prod.path, 'css'),
    'docs.css'
  );
});

gulp.task('build-docs-vendor', function() {
  return Promise.all([
    pkgDir(require.resolve('bootstrap')).then(rootDir => {
      const src = path.join(rootDir, 'dist');
      const dest = path.join(
        gulpConfig.lichen.pages.dist.prod.path,
        'vendor/bootstrap/dist'
      );
      return fs.removeAsync(dest).then(() => fs.copyAsync(src, dest));
    }),
    pkgDir(require.resolve('prism-themes')).then(rootDir => {
      const src = path.join(rootDir, 'themes');
      const dest = path.join(
        gulpConfig.lichen.pages.dist.prod.path,
        'vendor/prism-themes/themes'
      );
      return fs.removeAsync(dest).then(() => fs.copyAsync(src, dest));
    })
  ]);
});

gulp.task('build-docs-html', function() {
  return lichen.buildContent();
});

// Start the webserver.
gulp.task('webserver-init', function(cb) {
  const config = {...gulpConfig.webserver, open: false};

  gulp
    .src('./')
    .pipe(webserver(config))
    .on('end', cb);
});

// Start the LiveReload server.
gulp.task('livereload-init', function(cb) {
  if (!flags.livereloadInit) {
    flags.livereloadInit = true;
    server = livereload.createServer();
    open(livereloadOpen, browser);
  }
  cb();
});

// Refresh the page.
gulp.task('livereload-reload', function(cb) {
  server.refresh(livereloadOpen);
  cb();
});

gulp.task('watch:livereload', function() {
  const livereloadTask = 'livereload-reload';
  const watchTasks = [
    // CSS
    {
      files: [path.join(gulpConfig.lichen.pages.src.path, 'css/**/*.scss')],
      tasks: ['build-docs-css']
    },
    // HTML and data
    {
      files: [
        path.join(gulpConfig.lichen.pages.src.path, 'content/**/*'),
        path.join(gulpConfig.lichen.pages.src.path, 'data/**/*'),
        path.join(gulpConfig.lichen.pages.src.path, 'templates/**/*')
      ],
      tasks: ['build-docs-html']
    }
  ];

  _.forEach(watchTasks, function(watchConfig) {
    const tasks = _.clone(watchConfig.tasks);
    tasks.push(livereloadTask);
    startWatch(watchConfig.files, tasks);
  });
});

gulp.task('livereload', function() {
  runSequence(
    'build-docs',
    'webserver-init',
    'livereload-init',
    'watch:livereload'
  );
});

/* -----------------------------------------------------------------------------
 * Default task
 ---------------------------------------------------------------------------- */

gulp.task('default', ['livereload']);
