import { ExtensionVerificationGuard, registerViews } from '@doist/ui-extensions-server'

import { Test } from '@nestjs/testing'
import { DataSource } from 'typeorm'

import { AppModule } from '../../src/modules/app.module'
import { mockConnection } from '../mocks'
import { createTestDataSource } from '../test-app.module'
import {
    cleanTestDatabase,
    runTestDatabaseMigrations,
    TestDataFactory,
} from '../utils/e2e-test-harness'

import type { NestExpressApplication } from '@nestjs/platform-express'

/**
 * Create test app with mock database (for non-database tests)
 */
export async function createTestApp(): Promise<{
    appModule: NestExpressApplication
}> {
    const moduleRef = await Test.createTestingModule({
        imports: [AppModule],
    })
        .overrideProvider(DataSource)
        .useValue(mockConnection())
        .overrideGuard(ExtensionVerificationGuard)
        .useValue({ canActivate: () => true })
        .compile()

    const app = moduleRef.createNestApplication<NestExpressApplication>()

    await registerViews(app)

    return { appModule: await app.init() }
}

/**
 * Create test app with real database connection (for e2e tests that need database)
 */
export async function createTestAppWithDatabase(): Promise<{
    appModule: NestExpressApplication
    dataSource: DataSource
    testDataFactory: TestDataFactory
}> {
    const dataSource = createTestDataSource()
    await dataSource.initialize()

    // Run migrations and clean database before each test
    await runTestDatabaseMigrations(dataSource)
    await cleanTestDatabase(dataSource)

    const moduleRef = await Test.createTestingModule({
        imports: [AppModule],
    })
        .overrideProvider(DataSource)
        .useValue(dataSource)
        .overrideGuard(ExtensionVerificationGuard)
        .useValue({ canActivate: () => true })
        .compile()

    const app = moduleRef.createNestApplication<NestExpressApplication>()

    await registerViews(app)

    const testDataFactory = new TestDataFactory(dataSource)

    return {
        appModule: await app.init(),
        dataSource,
        testDataFactory,
    }
}
