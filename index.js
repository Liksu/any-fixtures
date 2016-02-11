/**
 * @example
 * // returns middleware
 * var fixtures = require('gulp-fixtures')({folders: ['fixtures'], api: '/api/v1/'});
 */

var extend = require('util')._extend;
var fs = require('fs');
var async = require('async');
var chalk = require('chalk');

var mimes = {
    'application/json': 'json',
    'text/html': 'html',
    'text/plain': 'txt',
    '*/*': 'any'
};

var config = {
    folders: ['fixtures'],
    api: '/api/v1/',
    verbose: true
};

function fixtures(req, res, next) {
    if (config.apiRe.test(req.url)) {
        var url = req.url
            .replace(new RegExp('^\\w+tps?://.+?' + config.api), '')
            .replace(config.apiRe, '')
            .replace(/\?.+/, '')
            .replace(/\/+$/, '');

        var accept = [];
        if (req.headers && req.headers.accept) {
            accept = req.headers.accept
                .replace(/(,\s*)?\*\/\*/, '')
                .replace(/;.+/, '')
                .split(/\s*,\s*/);
        }
        accept.push('*/*');

        var files = [];
        var content = {};
        var fill = function(folder, method, type) {
            var path = folder + '/' + [url, method, mimes[type] || type].join('.');
            files.push(path);
            content[path] = {headers: {'Content-Type': type}, mime: type};
        };

        config.folders.forEach(function(folder) {
            accept.forEach(fill.bind(null, folder, req.method.toLowerCase()));
            accept.forEach(fill.bind(null, folder, 'any'));
        });

        var result = null;
        async.filterLimit(files, 1, fs.exists, function(results) {
            if (results.length) {
                fs.readFile(results[0], function(error, data) {
                    result = {
                        content: data.toString(),
                        file: results[0],
                        additional: content[results[0]]
                    };

                    if (config.verbose) console.log(chalk.blue('return', result.additional.mime, 'fixture for', url), result.content);
                    res.writeHead(200, result.additional.headers);
                    res.end(result.content);
                });
            } else {
                next();
            }
        });
    } else {
        return next();
    }
}

module.exports = function(settings) {
    if (!settings.apiRe) settings.apiRe = new RegExp(settings.api);
    config = extend(config, settings);
    if (typeof config.folders === 'string') config.folders = [config.folders];

    return fixtures;
};
