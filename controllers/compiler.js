const { NodeVM } = require('vm2');
const fs = require('fs');
const path = require('path');
const axios = require('axios'); // Import axios globally if it's commonly used.

async function setupModules(externalModules = []) {
    const modules = { fs, path, axios }; // Axios, fs, and path are now a default part of the context.
    for (const moduleName of externalModules) {
        if (!modules[moduleName]) { // Prevent re-importing core modules.
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

async function run(code, external = '[]') {  // default to an empty array string if not provided
    let externalModules;
    try {
        externalModules = JSON.parse(external);
    } catch (error) {
        throw new Error("Failed to parse external modules: " + error.message);
    }

    const contextModules = await createContext(externalModules);

    const options = {
        console: 'inherit', // Or redirect it to capture console output
        sandbox: {},
        require: {
            external: true, // Allow all external modules, adjust based on need
            builtin: ['fs', 'path', 'axios'], // Restrict to necessary Node built-in modules
            context: 'sandbox',
            mock: contextModules,
        }
    };

    const vm = new NodeVM(options);

    try {
        const script = `module.exports = async function() {${code}}();`;
        const responseData = await vm.run(script, __dirname); // Execute the user-provided code
        console.log('Execution Result:', responseData);
        return responseData; // Returning the response data
    } catch (err) {
        console.error('Execution Error:', err);
        throw new Error(`Error executing script: ${err.message}`);
    }
}

module.exports = { run }; // Use CommonJS export syntax
