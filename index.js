'use strict';

var n2pm = require('./lib/n2pm');

var done = function (err) {
    err && console.error(err);
    return process.exit(err ? 1 : 0);
};

var args = require('minimist')(process.argv.slice(2));

switch (args._[0]) {
case 'install':
case 'i':
    return n2pm.install(args._[1], args._[2], args.force || args.f, done);
case 'uninstall':
case 'u':
    return n2pm.uninstall(args._[1], done);
case 'list':
case 'ls':
case 'l':
    return n2pm.list(done);
case 'concat':
case 'c':
    return n2pm.concat(args._.slice(1), args.output || args.out || args.o, done);
case 'cleanup':
    return n2pm.cleanup(args.force || args.f, done);
case 'help':
    return n2pm.help(args._[1], done);
default:
    return done('bad or missing command!');
}
