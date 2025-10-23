// Setup file for e2e tests to configure test database environment variables
process.env.TEST_DB_HOST = process.env.TEST_DB_HOST || '127.0.0.1'
process.env.TEST_DB_PORT = process.env.TEST_DB_PORT || '15306'
process.env.TEST_DB_USERNAME = process.env.TEST_DB_USERNAME || 'gsheets_admin'
process.env.TEST_DB_PASSWORD = process.env.TEST_DB_PASSWORD || 'gsheetsAdminPassword'
process.env.TEST_DB_NAME = process.env.TEST_DB_NAME || 'e2e-tests'

export {}
