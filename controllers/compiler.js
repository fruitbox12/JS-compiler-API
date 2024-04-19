const vm = require('vm');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const http = require('http');
const https = require('https');

async function setupModules(externalModules = []) {
    // Setup basic modules plus http and https which axios might rely on
    const modules = { fs, path, axios, http, https };
    for (const moduleName of externalModules) {
        if (!modules[moduleName]) {
            try {
                modules[moduleName] = await import(moduleName);
            } catch (error) {
                console.error(`Error importing ${moduleName}:`, error);
            }
        }
    }
    return modules;
}

async function createContext(externalModules) {
    const moduleMap = await setupModules(externalModules);
    const internalLogs = [];

    const sandbox = {
        console: { log: (value) => internalLogs.push(value) },
        require: (moduleName) => {
            if (moduleMap[moduleName]) {
                return moduleMap[moduleName];
            }
            throw new Error(`Module '${moduleName}' is not permitted`);
        },
        module: { exports: {} },
        exports: {},
        process,
        Buffer,
        setTimeout,
        clearTimeout,
        setInterval,
        clearInterval,
        setImmediate,
        clearImmediate
    };

    return vm.createContext(sandbox); // Create and return the VM context
}

async function run(code, externalModules = []) {
    const context = await createContext(externalModules);

    try {
        const script = new vm.Script(`(async () => {${code}})();`, { timeout: 5000 }); // Set a timeout for security
        const responseData = await script.runInContext(context, { displayErrors: true, timeout: 5000 });
        console.log('Execution Result:', responseData);
    } catch (err) {
        console.error('Error executing script:', err);
    }
}
module.exports = { run };
