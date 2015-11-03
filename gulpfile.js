var gulp = require('gulp');
var babel = require('gulp-babel');
var browserSync = require('browser-sync');
var browserify = require('browserify');
var babelify = require('babelify');
var less = require('gulp-less');
var source = require('vinyl-source-stream');
var autoprefixer = require('gulp-autoprefixer');
var manifest = require('gulp-manifest');
gulp.task('js', function () {
  browserify({
    entries : 'src/index.js',
    debug : true,
    transform : [babelify]
  })

  .bundle()
  .on('error', function (error) {
    console.error(error);
  })
  .pipe(source('app.js'))
  .pipe(gulp.dest('build'));
});

gulp.task('html', function () {
  gulp.src('src/index.html')
  .pipe(gulp.dest('build'));
});

gulp.task('data', function () {
  gulp.src('src/**/*.json')
  .pipe(gulp.dest('build'));
});

gulp.task('css', function () {
  gulp.src('src/**/*.less')
  .pipe(less())
  .pipe(autoprefixer())
  .pipe(gulp.dest('build'));
});

gulp.task('manifest', function(){
  gulp.src(['build/*.{css,html,js}'], { base: 'build/' })
    .pipe(manifest({
      hash: true,
      preferOnline: true,
      network: ['*'],
      filename: 'app.manifest',
      exclude: 'app.manifest'
   }))
  .pipe(gulp.dest('build'));
});

gulp.task('build', ['js', 'html', 'data', 'css', 'manifest']);

gulp.task('default', ['build', 'serve']);

gulp.task('serve', function () {
  browserSync.init({
    server: {
        baseDir: "./build"
    }
  });
  gulp.watch('src/**/*.js', ['js', browserSync.reload]);
  gulp.watch('src/**/*.less', ['css', browserSync.reload]);
  gulp.watch('src/**/*.html', ['html', browserSync.reload]);
});
