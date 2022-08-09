import {
    BaseConfiguration,
    getBaseConfigurationWithDatabase,
    validateEnv,
} from '@doist/ui-extensions-server'

export type Configuration = BaseConfiguration & {
    googleClientId: string
    googleClientSecret: string
    googleApiKey: string
    // This is only temporary until we get the token from the header.
    // After that, it can be removed
    todoistAuthToken: string
}

function getConfiguration(): Configuration {
    const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_API_KEY, TODOIST_AUTH_TOKEN } =
        process.env

    return {
        ...getBaseConfigurationWithDatabase(),
        googleClientId: validateEnv(GOOGLE_CLIENT_ID, 'GOOGLE_CLIENT_ID'),
        googleClientSecret: validateEnv(GOOGLE_CLIENT_SECRET, 'GOOGLE_CLIENT_SECRET'),
        googleApiKey: validateEnv(GOOGLE_API_KEY, 'GOOGLE_API_KEY'),
        todoistAuthToken: validateEnv(TODOIST_AUTH_TOKEN, 'TODOIST_AUTH_TOKEN'),
    }
}

export { getConfiguration }
