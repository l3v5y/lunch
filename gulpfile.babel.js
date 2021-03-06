import babel from 'gulp-babel';
import del from 'del';
import eslint from 'gulp-eslint';
import fs from 'fs';
import gulp from 'gulp';
import util, { PluginError } from 'gulp-util';
import mocha from 'gulp-mocha';
import sourcemaps from 'gulp-sourcemaps';
import sequence from 'gulp-sequence';
import nodemon from 'gulp-nodemon';
import webpack from 'webpack';
import path from 'path';
import babelConfig from './babelConfig.json';
import webpackProdConfig from './webpack.config.prod';

const buildArtifactsOut = './build-artifacts';
const lintSources = ['src/**/*.js', 'gulpfile.babel.js', 'webpack.config.dev.js', 'webpack.config.prod.js'];
const sourceMapConfig = {
  debug: true,
  includeContent: false,
  sourceRoot: function(file) {
    return path.join(path.relative(file.path, path.join(__dirname, '/src/')), '/src/');
  }
};

gulp.task('start-production', sequence('make', 'production-server'));

gulp.task('start', sequence('static-assets', 'build', ['watch-client', 'watch-server'], 'dev-server'));

gulp.task('make', sequence('clean', ['build', 'static-assets', 'prod-webpack']));

gulp.task('production-server', () => {
  nodemon({
    env: { 'NODE_ENV': JSON.stringify('production') },
    script: 'out/server/index.js',
    verbose: false,
    ignore: ['*'],
  });
});

gulp.task('dev-server', () => {
  nodemon({
    env: {
      'NODE_ENV': JSON.stringify('development'),
      'DEBUG': 'lunch:*', },
    delay: 10,
    script: 'out/server/index.js',
    ext: 'js',
    verbose: false,
    watch: ['out/server/**/*', 'out/shared/**/*'],
    ignore: [
      'out/client/**/*',
      'src/**/*'
    ],
  });
});

gulp.task('run-tests', (done) => {
  return sequence('clean', 'build', 'test:junit', 'lint:file')(done);
});

gulp.task('test:client', (done) => {
  return sequence('build-client', 'test-min', 'lint:console')(done);
});

gulp.task('test:server', (done) => {
  return sequence('build-server', 'test-min', 'lint:console')(done);
});

gulp.task('test:junit', () => {
  return gulp.src(['out/tests/**/*.spec.js'], { read: false })
    .pipe(mocha({
      reporter: 'mocha-junit-reporter',
      reporterOptions: {
        mochaFile: `${buildArtifactsOut}/tests.xml`
      }
    }));
});

gulp.task('test-min', () => {
  return gulp.src(['out/tests/**/*.spec.js'], { read: false })
    .pipe(mocha({ reporter: 'min' }));
});

gulp.task('watch-client', () => {
  gulp.watch([
    'src/client/**/*.js',
    'src/tests/client/**/*.js'],
    ['test:client']
  );
});

gulp.task('watch-server', () => {
  gulp.watch([
    'src/server/**/*.js',
    'src/shared/**/*.js',
    'src/tests/**/*.js',
  ], ['test:server']);
});

gulp.task('build', ['static-assets', 'build-client', 'build-server']);

gulp.task('build-client', () => {
  return gulp.src(['src/client/**/*.js', 'src/tests/**/*.js'], { base: './src' })
    .pipe(sourcemaps.init())
    .pipe(babel(babelConfig))
    .pipe(sourcemaps.write('.', sourceMapConfig))
    .pipe(gulp.dest('out'));
});

gulp.task('build-server', () => {
  return gulp.src([
      'src/server/**/*.js',
      'src/shared/**/*.js',
      'src/tests/**/*.js',
  ], { base: './src' })
    .pipe(sourcemaps.init())
    .pipe(babel(babelConfig))
    .pipe(sourcemaps.write('.', sourceMapConfig))
    .pipe(gulp.dest('out'));
});

gulp.task('static-assets', () => {
  return gulp.src(['src/server/index.html', 'src/server/favicon.ico'])
    .pipe(gulp.dest('out/server'));
});

gulp.task('lint:console', () => {
  return gulp.src(lintSources).pipe(eslint()).pipe(eslint.format());
});

gulp.task('lint:file', () => {
  return gulp.src(lintSources)
    .pipe(eslint())
    .pipe(eslint.format('checkstyle', fs.createWriteStream(`${buildArtifactsOut}/codestyle.xml`)));

});

gulp.task('prod-webpack', (done) => {
  webpack(webpackProdConfig, (err, stats) => {
    if (err) throw  new PluginError('webpack', err);
    util.log('[webpack]', stats.toString());
    done();
  })
});

gulp.task('clean', () => del(['out/**', 'build-artifacts']));
