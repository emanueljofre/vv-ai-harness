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

module.exports.main = async function (ffCollection, vvClient, response) {
    /*
    Script Name:    Script Name Here
    Customer:       Project Name
    Purpose:        Brief description of the purpose of the script. Called as a microservice from the VisualVault V5 Process Studio workflow.
    Preconditions:
                    - List of libraries, forms, queries, etc. that must exist for this code to run
                    - List other preconditions such as user permissions, environments, etc.
    Parameters:     The following represent variables passed into the function:
                    parameter1: Description of parameter1
                    parameter2: Description of parameter2
    Return Object:
                    output.MicroserviceResult:  true  - Process completed (Success or Warning paths)
                                                false - Critical error; workflow should branch to error path
                    output.MicroserviceMessage: Human-readable summary; carries joined error messages on Warning/Error paths
                    output.errors:              Array of error messages

                    Note: The workflow engine consumes fields mapped to workflow variables in Process Studio.
                          MicroserviceResult and MicroserviceMessage are conventional; output.errors and any
                          additional fields require explicit variable mapping to be readable from the workflow.

    Pseudo code:
                    1. Validate parameters
                    2. Business logic
                    3. Set status

    Date of Dev:    YYYY-MM-DD
    Last Rev Date:  YYYY-MM-DD

    Revision Notes:
                    YYYY-MM-DD - Developer Name: First setup of the script
    */

    /* ------------------------ Response & Log Variables ------------------------ */

    const serviceName = 'MyWorkflowMicroservice';

    // Execution ID is needed from the http header in order to help VV identify which workflow item/microservice is complete.
    const executionId = response.req.headers['vv-execution-id'];

    const output = {
        errors: [],
        MicroserviceMessage: '',
        MicroserviceResult: true,
    };

    const sessionToken = vvClient._httpHelper?._sessionToken ?? {};
    const baseUrl = vvClient.getBaseUrl();

    const logEntry = {
        customerAlias: sessionToken.customerAlias ?? 'unknown',
        databaseAlias: sessionToken.databaseAlias ?? 'unknown',
        environment: baseUrl ? new URL(baseUrl).hostname.split('.')[0] : 'unknown',
        errors: [],
        parameters: ffCollection,
        service: serviceName,
        status: 'Started',
    };

    /* ------------------------- Configurable Variables ------------------------- */

    // Define constants and configuration here. Examples:
    // const QUERY_NAME = "GetActiveUsers";

    /* ---------------------------- Helper Functions ---------------------------- */

    function getFieldValueByName(fieldName, isOptional = false) {
        // Reads a form-field value by name; pushes to `output.errors` if required and missing/empty.

        let fieldValue = ''; // Default value

        try {
            const field = ffCollection.getFormFieldByName(fieldName);
            const requiredFieldDoesntExists = !isOptional && !field;

            if (requiredFieldDoesntExists) {
                throw new Error(`The field '${fieldName}' was not found.`);
            }

            if (field) {
                // Check if the value property exits
                fieldValue = 'value' in field ? field.value : fieldValue;

                // Trim the value if it's a string to avoid strings with only spaces like "   "
                fieldValue = typeof fieldValue === 'string' ? fieldValue.trim() : fieldValue;

                // Check if the field is required and if it has a value. Added a condition to avoid 0 to be considered a falsy value
                const requiredFieldHasNoValue = !fieldValue && typeof fieldValue !== 'number' && !isOptional;

                // Check if the field is a dropdown with the default value "Select Item"
                // Some dropdowns have this value as the default one but some others don't
                const ddSelectItem = fieldValue === 'Select Item';

                if (requiredFieldHasNoValue || ddSelectItem) {
                    fieldValue = '';
                    throw new Error(`The value property for the field '${fieldName}' was not found or is empty.`);
                }
            }
        } catch (error) {
            output.errors.push(error.message);
        }

        return fieldValue;
    }

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
    response.json(200, {
        success: true,
        message: `${serviceName} Started`,
    });
    logger.info(sanitizeLog(logEntry));

    try {
        // Validate field parameters
        // const firstName = getFieldValueByName('First Name');

        if (output.errors.length > 0) {
            throw new Error(output.errors.join('; '));
        }

        // Business logic
        // ...

        // Set the success/warning status
        if (output.errors.length > 0) {
            logEntry.status = 'Warning';
            output.MicroserviceMessage = output.errors.join('; ');
        } else {
            logEntry.status = 'Success';
            output.MicroserviceMessage = 'Microservice completed successfully';
        }
    } catch (err) {
        logEntry.status = 'Error';
        output.errors.push(err.message);
        output.MicroserviceResult = false;
        output.MicroserviceMessage = err.message;
    } finally {
        try {
            await vvClient.scripts.completeWorkflowWebService(executionId, output);
        } catch (err) {
            logEntry.status = 'Error';
            output.errors.push(`WF completion signal failed: ${err.message}`);
        }

        logEntry.errors = output.errors;

        if (logEntry.status === 'Error') logger.error(sanitizeLog(logEntry));
        else if (logEntry.status === 'Warning') logger.warn(sanitizeLog(logEntry));
        else logger.info(sanitizeLog(logEntry));
    }
};
