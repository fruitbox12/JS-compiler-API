const fs = require('fs');
const path = require('path');
const axios = require('axios'); // Import axios globally if it's commonly used.
const { NodeVM } = require('vm2');

async function setupModules(externalModules) {
    const modules = { fs, path, axios }; // Initialize default modules

    if (externalModules) {
        if (typeof externalModules === 'string') {
            externalModules = [externalModules]; // Convert string to array for uniform processing
        }

        if (Array.isArray(externalModules)) {
            for (const externalModule of externalModules) {
                if (!modules[externalModule]) {
                    try {
                        modules[externalModule] = require(externalModule);
                    } catch (error) {
                        console.error(`Error importing ${externalModule}:`, error);
                    }
                }
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
        return res.status(400).json({ error: 'Invalid external module format' });
    }

    const context = await createContext(externalModules);

    const options = {
        console: 'inherit',
        sandbox: context,
        require: {
            external: true,
            builtin: ['*'],
            root: './',  // Optional: Define the root for modules.
            mock: {
                axios: axios // Explicitly provide axios to the VM
            }
        }
    };

    const vm = new NodeVM(options);

    try {
        // Wrap code in a module
        const code = `module.exports = async function() {${req.body.code}}();`;
        const responseData = await vm.run(code, __dirname);

        // Transform the axios response to avoid circular structure issues
        const transformedResponse = JSON.parse(JSON.stringify(responseData, (key, value) => {
            if (key === 'request' || key === 'config') {
                return undefined;
            }
            return value;
        }));

        return res.status(200).json({ output: transformedResponse });
    } catch (err) {
        // Improved error handling
        const stack = err.stack || '';
        const lineOfError = stack.includes('evalmachine.<anonymous>:') ? stack.split('evalmachine.<anonymous>:')[1].split('\n')[0] : 'Error executing script';
        const errorMsg = `${err.message} at line ${lineOfError}`;
        console.error('Script execution error:', errorMsg);
        return res.status(400).json({ error: errorMsg });
    }
};

module.exports = { run }; // Use CommonJS export syntax
