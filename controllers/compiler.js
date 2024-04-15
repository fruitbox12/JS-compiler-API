// Import statements with ES Module syntax
import { NodeVM } from 'vm2';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

// Async dynamic import for node-fetch due to its ESM-only nature
const fetchPromise = import('node-fetch').then(mod => mod.default);

const run = async (req, res) => {
    if (!req.query.code) {
        return res.status(400).json({
            state: 'Missing required parameter',
            error: 'Code parameter is required'
        });
    }

    const fetch = await fetchPromise; // Ensure fetch is loaded
    const internalLogs = [];

    // Prepare the sandbox with console and selected Node.js modules
    const sandbox = {
        console: {
            log: (...value) => {
                internalLogs.push(...value);
            }
        },
        require: moduleName => {
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

export { run };
