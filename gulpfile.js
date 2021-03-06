var gulp        = require('gulp'),
    gutil       = require('gulp-util'),
    editJson    = require('gulp-json-editor'),
    combineJson = require('gulp-jsoncombine'),
    source      = require('vinyl-source-stream'),
    es          = require('event-stream'),
    fs          = require('fs'),
    exec        = require('child_process').exec,
    Promise     = require('es6-promise').Promise,
    typescript  = require('gulp-typescript'),
    browserify  = require('browserify'),
    zip         = require('gulp-zip');

gulp.task('default', ['build', 'watch']);
gulp.task('build', ['manifest', 'browserify']);

// task: manifest
// - generate version
// - collect `content_scripts.part.json`
gulp.task('manifest', ['_content_script_partfiles'], function() {
    return Promise.all([ version(), contentScripts() ]).then(function(results) {
        var version     = results[0],
            scriptParts = results[1];
        return gulp.src('src/manifest.json')
            .pipe(editJson({
                version: version,
                content_scripts: scriptParts
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

function contentScripts() {
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

var tsProject = typescript.createProject({ module: 'commonjs' });
gulp.task('typescript', function() {
    return gulp.src('src/**/*.ts')
        .pipe(typescript(tsProject))
        .js.pipe(gulp.dest('app/'));
});

// task: browserify
// - collect entry points each defined in content_scripts.part.json
// - run browserify all entries
gulp.task('browserify', ['copy-js', 'typescript'], function() {
    var entries = contentScripts().then(function(defs) {
        return defs.reduce(function(prev, current) {
            return prev.concat(current['js']);
        }, []);
    });
    return entries.then(function(files) {
        var tasks = files.map(function(entry) {
            return browserify({ entries: [entry], basedir: 'app/' })
                .bundle()
                .pipe(source(entry))
                .pipe(gulp.dest('app/'));
        });
        return es.merge.apply(null, tasks);
    });
});

// task: release
// - pack `app` directory to a chrome extension
gulp.task('release', ['build'], function() {
    var appName = new Promise(function(resolve, reject) {
        fs.readFile('app/manifest.json', function(err, text) {
            return err ? reject(err) : resolve(JSON.parse(text)['name']);
        });
    });
    return Promise.all([ version(), appName ]).then(function(results) {
        var version = results[0],
            name    = results[1];
        return gulp.src('app/**/*')
            .pipe(zip(name + '-' + version + '.zip'))
            .pipe(gulp.dest('releases'));
    });
});

gulp.task('watch', function() {
    gulp.watch('src/**/*.json', ['manifest']);
    gulp.watch('src/**/*.ts',   ['browserify']);
    gulp.watch('src/**/*.js',   ['browserify']);
});
