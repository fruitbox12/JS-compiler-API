const vm = require('vm');

// Correctly require the necessary Node.js modules
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const fetch = require('node-fetch');  // Assuming 'node-fetch' is correctly installed

const run = async (req, res) => {
    if (!req.query.code) {
        return res.status(400).json({
            state: 'Missing required parameter',
            error: 'Code parameter is required'
        });
    }

    const internalLogs = [];

    // Prepare the context with access to console, and selected Node.js modules
    const context = {
        console: {
            log: (value) => {
                internalLogs.push(value);
            },
        },
        require: (moduleName) => {
            // Restrict the modules that can be required
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

    vm.createContext(context);

    try {
        const script = new vm.Script(req.query.code);

        // Run the script within the configured context
        script.runInContext(context, {
            lineOffset: 0,
            displayErrors: true,
        });

        return res.status(200).json({
            state: 'Success',
            output: internalLogs
        });
    } catch (err) {
        const lineOfError = err.stack
            .split('evalmachine.<anonymous>:')[1]
            .split('\n')[0];
        const errorMsg = `${err.message} at line ${lineOfError}`;
        return res.status(400).json({
            state: 'Failed',
            error: errorMsg
        });
    }
};

module.exports = {
    run
};
