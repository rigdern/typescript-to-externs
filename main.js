#!/usr/bin/env node

"use strict";

var fs = require('fs');
var path = require('path');
var tscore = require('./tscore');

function startRepl(context) {
    var repl = require("repl");
    var local = repl.start({});
    for (var k in context) {
        local.context[k] = context[k];
    }
}

function startsWith(s, prefix) {
    return s.substring(0, prefix.length) === prefix;
}

function isFromOrigin(origin, obj) {
    return obj.meta.origin === origin;
}

// Types
//   NYI:
//     - string-const

function isBuiltin(obj) {
    return ["number", "string", "boolean", "void", "any"].indexOf(obj.type) >= 0;
}

function isType(type, obj) {
    return obj.type === type;
}
var isObject = isType.bind(this, "object");
var isReference = isType.bind(this, "reference");
var isEnum = isType.bind(this, "enum");
var isTypeParam = isType.bind(this, "type-param");

// Kinds
function isKind(kind, obj) {
    return isObject(obj) && obj.meta.kind === kind;
}
var isModule = isKind.bind(this, 'module');
var isInterface = isKind.bind(this, 'interface');
var isClass = isKind.bind(this, 'class');

function isTopLevel(dts, scope) {
    return !!(dts.modules[scope] || dts.env[scope]);
}

// Is this correct?
function isFunction(obj) {
    return isInterface(obj) && obj.calls && obj.calls.length > 0;
}

function assign(name, value) {
    var s = "";
    if (name.indexOf('.') === -1) { s += "var "; }
    s += name;
    if (value !== undefined) { s += " = " + value; }
    s += ";";
    return s;
}

function processDts(origin, dts) {
    function processProperties(scope, properties, depth) {
        var output = [];
        for (var propName in properties) {
            var prop = properties[propName];
            if (isFromOrigin(origin, prop)) {
                output = output.concat(process(scope + "." + propName, prop.type, depth + 1));
            }
        }
        return output;
    }

    function process(scope, obj, depth) {
        var output = [];

        if (isReference(obj) || depth > 0 && isTopLevel(dts, scope)) {
            return [];
        }

        if (isObject(obj)) {
            if (isFromOrigin(origin, obj)) {
                if (isModule(obj) || isInterface(obj)) {
                    if (isFunction(obj)) {
                        var calls = obj.calls;
                        var parameters = calls[0].parameters.map(function (item) { return item.name; }).join(",");
                        output.push(assign(scope, "function (".concat(parameters, ") {}")));
                    } else {
                        output.push(assign(scope, "{}"));
                    }
                    output = output.concat(processProperties(scope, obj.properties, depth));
                } else if (isClass(obj)) {
                    output.push(assign(scope, "function () {}"));
                    output = output.concat(processProperties(scope + ".prototype", obj.properties, depth));
                } else {
                    throw 'NYI object ' + scope + ", " + JSON.stringify(obj);
                }
            }
        } else if (isBuiltin(obj) || isEnum(obj) || isTypeParam(obj)) {
            output.push(assign(scope));
        } else {
            throw 'NYI ' + scope + ", " + JSON.stringify(obj);
        }
        return output;
    }

    var out = [];
    Object.keys(dts.modules).sort().forEach(function (moduleName) {
        out = out.concat(process(moduleName, dts.modules[moduleName].object, 0));
    });
    Object.keys(dts.env).sort().forEach(function (name) {
        out = out.concat(process(name, dts.env[name].object, 0));
    });

    return out;
}

function processFile(filePath) {
    var text = fs.readFileSync(filePath, 'utf8').toString();
    var result = tscore([
        {
            file: ">lib.d.ts",
            text: fs.readFileSync(__dirname + '/lib/lib.d.ts', 'utf8')
        },
        { file: filePath, text: text }
    ]);

    var dts = {
        modules: {},
        env: {}
    };

    var modulePrefix = "module:";

    for (var prop in result.env) {
        var value = result.env[prop];
        if (isFromOrigin(filePath, value.object)) {
            if (startsWith(prop, modulePrefix)) {
                dts.modules[prop.substring(modulePrefix.length)] = value;
            } else {
                dts.env[prop] = value;
            }
        }
    }

    return processDts(filePath, dts);
}

function main() {
    if (process.argv.length < 3) {
        console.log("Please pass a valid path");
        return;
    }

    var filePath = path.resolve(process.argv[2]);
    var output = processFile(filePath);
    console.log(output.join('\r\n'));
}

if (require.main === module) {
    main();
}
