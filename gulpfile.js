var gulp     = require('gulp'),
    gutil    = require('gulp-util'),
    editJson = require('gulp-json-editor'),
    exec     = require('child_process').exec,
    Promise  = require('es6-promise').Promise;


gulp.task('manifest', function() {
    return version().then(function(version) {
        return gulp.src('src/manifest.json')
            .pipe(editJson({ version : version }))
            .pipe(gulp.dest('app/'));
    });
});

function version() {
    var promise = new Promise(function(resolve, reject) {
        exec('git describe --tags --always --dirty', function(err, stdout) {
            return err ? reject(err) : resolve(stdout);
        });
    });
    return promise.then(function(desc) {
        if (!/\d\.\d\.\d/.test(desc)) {
            gutil.log(gutil.colors.yellow('add git tag 1-3 dot-separated intergers (e.g. 0.0.1) for auto-versioning'));
            desc = '0.0.0.0';
        }
        var version = desc.replace(/\n$/, '')
            .replace(/-(\d+)/, '.$1')
            .replace(/-g[0-9a-f]+/, '')
            .replace(/-dirty/, '');
        return version;
    });
}
