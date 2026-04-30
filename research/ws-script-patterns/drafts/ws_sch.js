const logger = require('../log');

module.exports.getCredentials = function () {
    const customerAlias = 'CUSTOMER ALIAS';
    const databaseAlias = 'DATABASE ALIAS';
    const clientId = 'CLIENT ID';
    const clientSecret = 'CLIENT SECRET';

    return {
        customerAlias,
        databaseAlias,
        clientId,
        clientSecret,
        userId: clientId,
        password: clientSecret,
    };
};

module.exports.main = async function (vvClient, response, token) {
    /*
    Script Name:    Script Name Here
    Customer:       Project Name
    Purpose:        Brief description of the purpose of the script. Runs as a scheduled process triggered by the VisualVault scheduler.
    Preconditions:
                    - List of libraries, forms, queries, etc. that must exist for this code to run
                    - List other preconditions such as user permissions, environments, etc.

    Completion contract:
                    postCompletion(token, action, result, message) signals completion to the scheduler.
                    action:  'Complete'
                    result:  true on Success/Warning paths, false on Error
                    message: Scheduled Service Log message

    Pseudo code:
                    1. Business logic
                    2. Item-level operations (loop with per-item try/catch to continue on failure)
                    3. Set status

    Date of Dev:    YYYY-MM-DD
    Last Rev Date:  YYYY-MM-DD

    Revision Notes:
                    YYYY-MM-DD - Developer Name: First setup of the script
    */

    /* ------------------------ Response & Log Variables ------------------------ */

    const serviceName = 'ServiceNameHere';
    const processID = token;

    const output = {
        errors: [],
        status: 'Success',
    };

    const sessionToken = vvClient._httpHelper?._sessionToken ?? {};
    const baseUrl = vvClient.getBaseUrl();

    const logEntry = {
        customerAlias: sessionToken.customerAlias ?? 'unknown',
        databaseAlias: sessionToken.databaseAlias ?? 'unknown',
        environment: baseUrl ? new URL(baseUrl).hostname.split('.')[0] : 'unknown',
        errors: [],
        service: serviceName,
        status: 'Started',
    };

    /* ------------------------- Configurable Variables ------------------------- */

    // Define constants and configuration here. Examples:
    // const FORM_TEMPLATE_NAME = "User Registration";
    // const QUERY_NAME = "GetActiveUsers";

    /* ---------------------------- Helper Functions ---------------------------- */

    function parseRes(vvClientRes) {
        // Parses a vvClient response if it's a JSON string; otherwise returns it unchanged.

        try {
            // Parses the response in case it's a JSON string
            const jsObject = JSON.parse(vvClientRes);
            // Handle non-exception-throwing cases:
            if (jsObject && typeof jsObject === 'object') {
                vvClientRes = jsObject;
            }
        } catch (e) {
            // If an error occurs, it's because the resp is already a JS object and doesn't need to be parsed
        }
        return vvClientRes;
    }

    function checkMetaAndStatus(vvClientRes, shortDescription, ignoreStatusCode = 999) {
        // Asserts the response has `meta` with status 200/201 (or `ignoreStatusCode`). Pass-through on success.

        if (!vvClientRes.meta) {
            throw new Error(
                `${shortDescription} error. No meta object found in response. Check method call parameters and credentials.`
            );
        }

        const status = vvClientRes.meta.status;

        // If the status is not the expected one, throw an error
        if (status != 200 && status != 201 && status != ignoreStatusCode) {
            const errorReason =
                vvClientRes.meta.errors && vvClientRes.meta.errors[0]
                    ? vvClientRes.meta.errors[0].reason
                    : 'unspecified';
            throw new Error(`${shortDescription} error. Status: ${vvClientRes.meta.status}. Reason: ${errorReason}`);
        }
        return vvClientRes;
    }

    function checkDataPropertyExists(vvClientRes, shortDescription, ignoreStatusCode = 999) {
        // Asserts the response has a truthy `data` property. Pass-through on success.

        const status = vvClientRes.meta.status;

        if (status != ignoreStatusCode) {
            // If the data property doesn't exist, throw an error
            if (!vvClientRes.data) {
                throw new Error(
                    `${shortDescription} data property was not present. Please, check parameters and syntax. Status: ${status}.`
                );
            }
        }

        return vvClientRes;
    }

    function checkDataIsNotEmpty(vvClientRes, shortDescription, ignoreStatusCode = 999) {
        // Asserts `data` is non-empty; also flags WS-style `['Error', '<reason>']` tuples. Pass-through on success.

        const status = vvClientRes.meta.status;

        if (status != ignoreStatusCode) {
            const dataIsArray = Array.isArray(vvClientRes.data);
            const dataIsObject = vvClientRes.data !== null && typeof vvClientRes.data === 'object';
            const isEmptyArray = dataIsArray && vvClientRes.data.length == 0;
            const isEmptyObject = dataIsObject && Object.keys(vvClientRes.data).length == 0;

            // If the data is empty, throw an error
            if (isEmptyArray || isEmptyObject) {
                throw new Error(
                    `${shortDescription} returned no data. Please, check parameters and syntax. Status: ${status}.`
                );
            }
            // If it is a Web Service response, check that the first value is not an Error status
            if (dataIsArray) {
                const firstValue = vvClientRes.data[0];

                if (firstValue == 'Error') {
                    throw new Error(
                        `${shortDescription} returned an error. Please, check the called Web Service. Status Description: ${vvClientRes.data[1]}.`
                    );
                }
            }
        }
        return vvClientRes;
    }

    function sanitizeLog(entry) {
        // Sanitizes a log entry: serializes values to strings and strips characters that break logs.

        function serializeValue(value) {
            if (Array.isArray(value)) return value.join('; ');
            if (value instanceof Date) return value.toUTCString();
            if (value !== null && typeof value === 'object') return JSON.stringify(value);
            return String(value);
        }

        // Iterate over each property and rebuild with sanitized values
        return Object.fromEntries(
            Object.entries(entry).map(([key, value]) => {
                const isStructured = Array.isArray(value) || (value !== null && typeof value === 'object');
                const serialized = serializeValue(value);

                return [
                    key,
                    isStructured
                        ? serialized.replace(/[\r\n\t\0]/g, ' ') // Strip newlines/tabs/nulls only
                        : serialized.replace(/[,"\\\r\n\t\0]/g, ' '), // Also strip commas/quotes/backslashes
                ];
            })
        );
    }

    /* ---------------------------------- Main ---------------------------------- */

    // Platform acknowledgment
    response.json(200, `${serviceName} Started`);
    logger.info(sanitizeLog(logEntry));

    try {
        // Business logic
        // ...

        // Set status
        if (output.errors.length > 0) output.status = 'Warning';
    } catch (err) {
        output.status = 'Error';
        output.errors.push(err.message);
    } finally {
        try {
            await vvClient.scheduledProcess.postCompletion(
                processID,
                'Complete',
                output.status !== 'Error',
                output.status === 'Success' ? 'Completed successfully' : output.errors.join('; ')
            );
        } catch (err) {
            output.status = 'Error';
            output.errors.push(`SP completion signal failed: ${err.message}`);
        }

        logEntry.status = output.status;
        logEntry.errors = output.errors;

        if (output.status === 'Error') logger.error(sanitizeLog(logEntry));
        else if (output.status === 'Warning') logger.warn(sanitizeLog(logEntry));
        else logger.info(sanitizeLog(logEntry));
    }
};
