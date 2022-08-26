const vm = require('vm');

const run = async (req, res) => {
    if(!req.query.code)
        return res.status(400).json({
            state: 'Missing required parameter',
            error: 'Code parameter is required'
        });

    const internalLogs = [];

    const context = {
      console: {
        log: (value) => {
          internalLogs.push(value);
        },
      },
    };
    vm.createContext(context);

    try {
      const script = new vm.Script(req.query['code']);

      // run the script
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
        .split('\n')[0]
      const errorMsg = `${err.message} at line ${lineOfError}`;
      return res.status(400).json({
        state: 'Failed',
        error: errorMsg
      });
    }

}

module.exports = {
    run
}