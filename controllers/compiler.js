const vm = require('vm');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

async function setupModules(externalModules = []) {
    const modules = { fs, path, axios };
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
        exports: {}
    };
}

async function run(req, res) {
    if (!req.body.code) {
        return res.status(400).json({ error: 'Code is required' });
    }

    let externalModules = [];
    try {
        externalModules = req.body.external ? JSON.parse(req.body.external) : [];
    } catch (error) {
        return res.status(400).json({ error: 'Invalid external modules format' });
    }

    const context = await createContext(externalModules);
    vm.createContext(context);

    try {
        const script = new vm.Script(`(async () => {${req.body.code}})();`);
        const responseData = await script.runInContext(context, { lineOffset: 0, displayErrors: true });
        return res.status(200).json({ output: responseData });
    } catch (err) {
        const stack = err.stack || '';
        const lineOfError = stack.includes('evalmachine.<anonymous>:') ? stack.split('evalmachine.<anonymous>:')[1].split('\n')[0] : 'Error executing script';
        const errorMsg = `${err.message} at line ${lineOfError}`;
        return res.status(400).json({ error: errorMsg });
    }
};

module.exports = { run };
