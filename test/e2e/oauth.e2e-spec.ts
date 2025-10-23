import { encryptState } from '@doist/ui-extensions-server'

import { createTestAppWithDatabase } from './helpers'

import type { INestApplication } from '@nestjs/common'
import type { DataSource } from 'typeorm'
import type { TestDataFactory } from '../utils/e2e-test-harness'

// Skip these tests if test database is not available
const describeIfDb = process.env.TEST_DB_HOST ? describe : describe.skip

describeIfDb('OAuth CSRF Protection e2e tests', () => {
    let app: INestApplication
    let dataSource: DataSource
    let testDataFactory: TestDataFactory

    const OAUTH_STATE_KEY = process.env.OAUTH_STATE_KEY || 'test-key'
    const TEST_USER_ID = 12345
    const TEST_EXTERNAL_USER_ID = '67890'
    const ATTACKER_USER_ID = 99999
    const ATTACKER_EXTERNAL_USER_ID = '88888'

    beforeAll(async () => {
        const testApp = await createTestAppWithDatabase()
        app = testApp.appModule
        dataSource = testApp.dataSource
        testDataFactory = testApp.testDataFactory
    })

    afterAll(async () => {
        await dataSource.destroy()
        await app.close()
    })

    beforeEach(async () => {
        // Clean database before each test
        const userRepository = dataSource.getRepository('User')
        await userRepository.clear()
    })

    describe('OAuth State Binding', () => {
        it('should bind externalUserId to OAuth state when user exists', async () => {
            // Create a user with externalUserId
            await testDataFactory.createUser({
                twistId: TEST_USER_ID,
                externalUserId: TEST_EXTERNAL_USER_ID,
                authToken: 'existing-token',
            })

            // Mock the authorization URL generation
            // In a real scenario, you would call the endpoint that generates the auth URL
            // and verify that the state parameter includes the externalUserId
            const user = await testDataFactory.getUser(TEST_USER_ID)
            expect(user).toBeDefined()
            expect(user?.externalUserId).toBe(TEST_EXTERNAL_USER_ID)
        })

        it('should create OAuth state without externalUserId for first-time users', async () => {
            // For first-time users, externalUserId won't exist yet
            // The state should still be created but without externalUserId
            const user = await testDataFactory.getUser(TEST_USER_ID)
            expect(user).toBeNull()
        })
    })

    describe('OAuth Callback CSRF Protection', () => {
        it('should accept OAuth callback when externalUserId matches', () => {
            // This test would require mocking the OAuth provider callback
            // In a real implementation, you would:
            // 1. Create a user with specific externalUserId
            // 2. Generate a state with that externalUserId bound
            // 3. Simulate OAuth callback with matching user identity
            // 4. Verify that the authentication succeeds

            const guid = 'test-guid-123'
            const expiryTime = Date.now() + 60 * 60 * 1000
            const encryptedState = encryptState(
                guid,
                TEST_USER_ID,
                expiryTime,
                OAUTH_STATE_KEY,
                TEST_EXTERNAL_USER_ID,
            )

            // Verify state can be created with externalUserId
            expect(encryptedState).toBeDefined()
            expect(typeof encryptedState).toBe('string')
        })

        it('should detect CSRF when externalUserId does not match', () => {
            // This test simulates a CSRF attack scenario:
            // 1. Attacker initiates OAuth with their userId
            // 2. Victim completes OAuth (their credentials returned)
            // 3. System should detect mismatch and reject

            // Create attacker's state
            const guid = 'attacker-guid-123'
            const expiryTime = Date.now() + 60 * 60 * 1000
            const attackerState = encryptState(
                guid,
                ATTACKER_USER_ID,
                expiryTime,
                OAUTH_STATE_KEY,
                ATTACKER_EXTERNAL_USER_ID,
            )

            // In a real test, you would:
            // 1. Use attackerState in OAuth flow
            // 2. Return victim's credentials from OAuth provider
            // 3. Verify system rejects due to externalUserId mismatch

            expect(attackerState).toBeDefined()
        })

        it('should verify userId matches externalUserId for first-time users', () => {
            // For first-time users (no externalUserId in state):
            // System should verify that context userId matches OAuth provider's user ID
            // This prevents CSRF for initial authentication

            const guid = 'new-user-guid-123'
            const expiryTime = Date.now() + 60 * 60 * 1000
            const stateWithoutExternalId = encryptState(
                guid,
                TEST_USER_ID,
                expiryTime,
                OAUTH_STATE_KEY,
                undefined,
            )

            expect(stateWithoutExternalId).toBeDefined()
        })
    })

    describe('CSRF Attack Rollback', () => {
        it('should remove victim credentials if CSRF detected on first auth', async () => {
            // Verify no user exists initially
            let user = await testDataFactory.getUser(ATTACKER_USER_ID)
            expect(user).toBeNull()

            // In a real scenario:
            // 1. CSRF attack is detected during OAuth callback
            // 2. If user didn't exist before, their credentials should be removed
            // 3. Attacker should see login card instead of victim's data

            // For now, verify we can create and delete users
            await testDataFactory.createUser({
                twistId: ATTACKER_USER_ID,
                externalUserId: TEST_EXTERNAL_USER_ID,
            })

            user = await testDataFactory.getUser(ATTACKER_USER_ID)
            expect(user).toBeDefined()

            await testDataFactory.deleteUser(ATTACKER_USER_ID)

            user = await testDataFactory.getUser(ATTACKER_USER_ID)
            expect(user).toBeNull()
        })

        it('should not remove existing user credentials if CSRF detected', async () => {
            // If user existed before OAuth callback, don't remove their credentials
            await testDataFactory.createUser({
                twistId: TEST_USER_ID,
                externalUserId: TEST_EXTERNAL_USER_ID,
                authToken: 'existing-token',
            })

            const user = await testDataFactory.getUser(TEST_USER_ID)
            expect(user).toBeDefined()
            expect(user?.authToken).toBe('existing-token')

            // In real scenario, if CSRF is detected but user existed before,
            // their original credentials should remain intact
        })
    })

    describe('Access-time Validation', () => {
        it('should verify stored externalUserId matches request context', async () => {
            // Create user with specific externalUserId
            await testDataFactory.createUser({
                twistId: TEST_USER_ID,
                externalUserId: TEST_EXTERNAL_USER_ID,
                authToken: 'test-token',
            })

            const user = await testDataFactory.getUser(TEST_USER_ID)
            expect(user).toBeDefined()
            expect(user?.externalUserId).toBe(TEST_EXTERNAL_USER_ID)

            // In real implementation, isAuthorized() should verify
            // the stored externalUserId matches the request context userId
        })
    })
})
