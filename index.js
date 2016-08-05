'use strict';
var fs = require('fs');
var path = require('path');
var fetch = require('node-fetch');
var mkdirp = require('mkdirp');
var rimraf = require('rimraf');
var CombinedStream = require('combined-stream2');
var debug = require('debug')('n2pm');
var DEBUG = !!debug.enabled;

var cacheDir = '/tmp/n2pm/cache';
mkdirp.sync(cacheDir);

var localDir = path.resolve(process.cwd(), '.n2pm');
mkdirp.sync(localDir);

function install(name, url, force, done) {
    var cacheFile = path.resolve(cacheDir, name);
    var localFile = path.resolve(localDir, name);
    if (url && (force || !fs.existsSync(cacheFile))) {
        DEBUG && debug('download', url);
        return fetch(url).then(function (res) {
            fs.unlinkSync(cacheFile);
            var tempFile = path.resolve(cacheDir, name + Date.now());
            var tempOut = fs.createWriteStream(tempFile);
            res.body.pipe(tempOut)
                .on('error', done)
                .on('finish', function () {
                    DEBUG && debug('download ok:', url, '-->', tempFile);
                    fs.rename(tempFile, cacheFile, function (err) {
                        if (err) {
                            return done(err);
                        }
                        DEBUG && debug('cache ok:', tempFile, '-->', cacheFile);
                        install(name, url, false); // no recursion! use cache!
                    });
                });
        }).catch(done);
    }
    DEBUG && debug('install', name, '<--', url);
    var cacheIn = fs.createReadStream(cacheFile);
    var localOut = fs.createWriteStream(localFile);
    cacheIn.pipe(localOut)
        .on('error', done)
        .on('finish', function () {
            DEBUG && debug('install ok', name, '-->', localFile);
            done();
        });
}

function uninstall(name, done) {
    var localFile = path.resolve(localDir, name);
    rimraf(localFile, done);
}

function list(done) {
    fs.readdir(localDir, function (err, names) {
        if (err) {
            return done(err);
        }
        console.log(names);
        done();
    });
}

function concat(names, output, done) {
    DEBUG && debug('concat', names, '-->', output);
    var combinedIn = names.reduce(function (combinedIn, name) {
        var localFile = path.resolve(localDir, name);
        var localIn = fs.createReadStream(localFile);
        DEBUG && debug('combine ', localFile);
        combinedIn.append(localIn);
        return combinedIn;
    }, CombinedStream.create());
    var concatOut = process.stdout;
    if (output && output !== '-') {
        var outputFile = path.resolve(process.cwd(), output);
        concatOut = fs.createWriteStream(outputFile);
    }
    combinedIn.pipe(concatOut)
        .on('error', done)
        .on('finish', function () {
            DEBUG && debug('concat ok', names, '-->', output);
            done();
        });
}

function cleanup(force, done) {
    if (force) {
        DEBUG && debug('rm -rf', cacheDir);
        return rimraf(cacheDir, function (err) {
            if (err) {
                return done(err);
            }
            mkdirp(cacheDir, done);
        });
    }
    return done('"cleanup" command needs "--force" always ;)');
}

function help(command, done) {
    console.log('many the **SOURCE** be with you...');
    console.log('n2pm ' + command + ' [args...]');
    // TODO: ...
    return done();
}

function dispatch(command, args, done) {
    DEBUG && debug('dispatch:', command, args)
    switch (command) {
    case 'install':
    case 'i':
        return install(args._[1], args._[2], args.force || args.f, done);
    case 'uninstall':
    case 'u':
        return uninstall(args._[1], done);
    case 'list':
    case 'ls':
    case 'l':
        return list(done);
    case 'concat':
    case 'c':
        return concat(args._.slice(1), args.output || args.out || args.o, done);
    case 'cleanup':
        return cleanup(args.force || args.f, done);
    case 'help':
        return help(args._[1], done);
    default:
        return done('bad or missing command!');
    }
}

module.exports = {
    install: install,
    uninstall: uninstall,
    list: list,
    concat: concat,
    // TODO: uglify, merge, lint, jsx, babel, ... and deploy & rollback
    cleanup: cleanup,
    help: help
};

if (require.main == module) {
    var args = require('minimist')(process.argv.slice(2));
    dispatch(args._[0], args, function (err) {
        err && console.error(err);
        return process.exit(err ? 1 : 0);
    });
}

