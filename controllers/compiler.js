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

    return {
        console: { log: (value) => internalLogs.push(value) },
        require: (moduleName) => {
            if (moduleMap[moduleName]) {
                return moduleMap[moduleName];
            }
            throw new Error(`Module '${moduleName}' is not permitted`);
        },
        module: { exports: {} },
        exports: {},
        process, // Pass global process object
        Buffer: Buffer, // Ensure Buffer is available for modules that might need it
        // Set up a basic global object that might be used by node modules
        global: {
            Buffer,
            process,
            console: { log: (value) => internalLogs.push(value) },
            setTimeout,
            clearTimeout,
            setInterval,
            clearInterval,
            setImmediate,
            clearImmediate,
            require: (moduleName) => {
                if (moduleMap[moduleName]) {
                    return moduleMap[moduleName];
                }
                throw new Error(`Module '${moduleName}' is not permitted`);
            }
        }
    };
}

async function run(req, res) {
    if (!req.body || !req.body.code) {
        return res.status(400).json({ error: 'Code is required' });
    }

    let externalModules = [];
    try {
        externalModules = req.body.external ? JSON.parse(req.body.external) : [];
    } catch (error) {
        return res.status(400).json({ error: 'Invalid external modules format' });
    }

    const context = await createContext(externalModules);
    vm.createContext(context); // Create VM context with the defined properties

    try {
        const script = new vm.Script(`(async () => {${req.body.code}})();`, { timeout: 5000 }); // Set a timeout for security
        const responseData = await script.runInContext(context, { lineOffset: 0, displayErrors: true, timeout: 5000 });
        return res.status(200).json({ output: responseData });
    } catch (err) {
        const stack = err.stack || '';
        const lineOfError = stack.includes('evalmachine.<anonymous>:') ? stack.split('evalmachine.<anonymous>:')[1].split('\n')[0] : 'Error executing script';
        const errorMsg = `${err.message} at line ${lineOfError}`;
        return res.status(400).json({ error: errorMsg });
    }
};

module.exports = { run };
