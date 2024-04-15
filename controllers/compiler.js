import vm from 'vm';

// Asynchronously import the necessary modules
const setupModules = async () => {
    const fs = await import('fs');
    const path = await import('path');
    const axios = await import('axios');
    const fetch = await import('node-fetch');

    return { fs, path, axios, fetch };
};

const run = async (req, res) => {
    if (!req.query.code) {
        return res.status(400).json({
            state: 'Missing required parameter',
            error: 'Code parameter is required'
        });
    }

    const { fs, path, axios, fetch } = await setupModules();
    const internalLogs = [];

    // Prepare the context with access to console, and selected Node.js modules
    const context = {
        console: {
            log: (value) => {
                internalLogs.push(value);
            }
        },
        require: (moduleName) => {
            // Map module names to their corresponding imports
            const modules = { fs, path, axios, fetch };
            if (modules[moduleName]) {
                return modules[moduleName];
            }
            throw new Error(`Module '${moduleName}' is not permitted`);
        }
    };

    vm.createContext(context); // Create a VM context with the prepared sandbox

    try {
        // Execute the code within the VM
        const script = new vm.Script(req.query.code);
        script.runInContext(context, {
            lineOffset: 0,
            displayErrors: true,
        });

        return res.status(200).json({
            state: 'Success',
            output: internalLogs
        });
    } catch (err) {
        const lineOfError = err.stack.split('evalmachine.<anonymous>:')[1].split('\n')[0];
        const errorMsg = `${err.message} at line ${lineOfError}`;
        return res.status(400).json({
            state: 'Failed',
            error: errorMsg
        });
    }
}

export { run }; // Use ES Module export syntax
