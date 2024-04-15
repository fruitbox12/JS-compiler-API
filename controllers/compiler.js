const { NodeVM } = require('vm2');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const fetch = require('node-fetch');

const run = async (req, res) => {
    if (!req.query.code) {
        return res.status(400).json({
            state: 'Missing required parameter',
            error: 'Code parameter is required'
        });
    }

    const internalLogs = [];

    // Prepare the sandbox with console and selected Node.js modules
    const sandbox = {
        console: {
            log: (...value) => {
                internalLogs.push(...value);
            }
        },
        require: moduleName => {
            if (['fs', 'path', 'axios', 'fetch'].includes(moduleName)) {
                switch (moduleName) {
                    case 'fs':
                        return fs;
                    case 'path':
                        return path;
                    case 'axios':
                        return axios;
                    case 'fetch':
                        return fetch;
                    default:
                        throw new Error(`Module '${moduleName}' is not permitted`);
                }
            }
            throw new Error(`Module '${moduleName}' is not permitted`);
        }
    };

    const vm = new NodeVM({
        console: 'redirect',
        sandbox,
        require: {
            external: true,
            builtin: ['fs', 'path'],
            mock: {
                axios: axios,
                fetch: fetch
            }
        }
    });

    try {
        // Run the user provided code safely
        const script = new vm.Script(`module.exports = async () => { ${req.query.code} }();`);
        const result = await vm.run(script, __dirname);

        res.status(200).json({
            state: 'Success',
            output: internalLogs,
            result: result
        });
    } catch (err) {
        const lineOfError = err.stack.split('VMError:')[1] || err.stack;
        res.status(400).json({
            state: 'Failed',
            error: `Error: ${err.message} at ${lineOfError}`
        });
    }
};

module.exports = { run };
