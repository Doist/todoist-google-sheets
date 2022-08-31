import {
    BaseConfiguration,
    getBaseConfigurationWithDatabase,
    validateEnv,
} from '@doist/ui-extensions-server'

export type Configuration = BaseConfiguration & {
    googleClientId: string
    googleClientSecret: string
    googleApiKey: string
}

function getConfiguration(): Configuration {
    const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_API_KEY } = process.env

    return {
        ...getBaseConfigurationWithDatabase(),
        googleClientId: validateEnv(GOOGLE_CLIENT_ID, 'GOOGLE_CLIENT_ID'),
        googleClientSecret: validateEnv(GOOGLE_CLIENT_SECRET, 'GOOGLE_CLIENT_SECRET'),
        googleApiKey: validateEnv(GOOGLE_API_KEY, 'GOOGLE_API_KEY'),
    }
}

export { getConfiguration }
