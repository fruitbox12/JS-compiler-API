const vm = require('vm');
const fs = require('fs');
const path = require('path');
const axios = require('axios');  // Import axios globally if it's commonly used.

async function setupModules(externalModules = []) {
    const modules = { fs, path, axios }; // Axios is now a default part of the context.
    for (const moduleName of externalModules) {
        if (!modules[moduleName]) { // Prevent re-importing axios or core modules.
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
        return res.status(400).json({ error: 'Missing required parameter: Code is required' });
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
        const script = new vm.Script(`module.exports = async function() {${req.body.code}}();`);
        const responseData = await script.runInContext(context, { lineOffset: 0, displayErrors: true });
        return res.status(200).json({ output: responseData });
    } catch (err) {
        // Improved error handling
        const stack = err.stack || '';
        const lineOfError = stack.includes('evalmachine.<anonymous>:') ? stack.split('evalmachine.<anonymous>:')[1].split('\n')[0] : 'Error executing script';
        const errorMsg = `${err.message} at line ${lineOfError}`;
        return res.status(400).json({ error: errorMsg });
    }
};



module.exports = { run }; // Use CommonJS export syntax
