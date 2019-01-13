const gulp = require('gulp');
const rename = require('gulp-rename');

gulp.task('default', () => {
    return gulp.src('./server/index.js')
        .pipe(rename('server.js'))
        .pipe(gulp.dest('./dist'))
});