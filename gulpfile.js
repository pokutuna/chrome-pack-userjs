var gulp        = require('gulp'),
    gutil       = require('gulp-util'),
    editJson    = require('gulp-json-editor'),
    combineJson = require('gulp-jsoncombine'),
    fs          = require('fs'),
    exec        = require('child_process').exec,
    Promise     = require('es6-promise').Promise,
    typescript  = require('gulp-typescript');


gulp.task('manifest', ['_content_script_partfiles'], function() {
    return Promise.all([version(), contentScript()]).then(function(results) {
        var version        = results[0],
            contentScripts = results[1];
        return gulp.src('src/manifest.json')
            .pipe(editJson({
                version:         version,
                content_scripts: contentScripts
            }))
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

function contentScript() {
    return new Promise(function(resolve, reject) {
        fs.readFile('app/tmp/content_scripts.json', function(err, text) {
            return err ? reject(err) : resolve(JSON.parse(text));
        });
    });
}

gulp.task('_content_script_partfiles', function() {
    return gulp.src('src/**/content_scripts.part.json')
        .pipe(combineJson('content_scripts.json', function(data) {
            var values = Object.keys(data).map(function(key) { return data[key]; });
            return new Buffer(JSON.stringify(values));
        }))
        .pipe(gulp.dest('app/tmp/'));
});

gulp.task('copy-js', function() {
    return gulp.src('src/**/*.js', { base : 'src' })
        .pipe(gulp.dest('app/'));
});

var tsProject = typescript.createProject({ module: 'commonjs', sortOutput: true });
gulp.task('typescript', function() {
    return gulp.src('src/**/*.ts')
        .pipe(typescript(tsProject))
        .js.pipe(gulp.dest('app/'));
});

gulp.task('default', ['copy-js', 'typescript', 'manifest']);
