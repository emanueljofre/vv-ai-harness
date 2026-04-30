// Minimal smoke test for completeWorkflowWebService.
// Pasted into the "wf test" service body in vv5dev / EmanuelJofre.
// On any trigger: ack, call completeWorkflowWebService with a baseline success,
// log the response to stdout. That's it.

const logger = require('../log');

module.exports.getCredentials = function () {
    const env = global.VV_ENV || {};
    return {
        customerAlias: env.customerAlias,
        databaseAlias: env.databaseAlias,
        clientId: env.clientId,
        clientSecret: env.clientSecret,
        userId: env.clientId,
        password: env.clientSecret,
        audience: env.audience || '',
    };
};

module.exports.main = async function (ffCollection, vvClient, response) {
    const executionId = response.req.headers['vv-execution-id'];
    response.json(200, { started: true });

    logger.info('[wf test] received call, executionId=' + executionId);

    try {
        const res = await vvClient.scripts.completeWorkflowWebService(executionId, {
            MicroserviceResult: true,
            MicroserviceMessage: 'smoke test',
        });
        logger.info('[wf test] completeWorkflowWebService response: ' + JSON.stringify(res));
    } catch (err) {
        logger.error('[wf test] completeWorkflowWebService failed: ' + err.message);
    }
};
