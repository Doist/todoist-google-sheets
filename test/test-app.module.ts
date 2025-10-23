import { ExtensionVerificationGuard } from '@doist/ui-extensions-server'

import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'

import { User } from '../src/entities/user.entity'
import { AppModule } from '../src/modules/app.module'

/**
 * Creates a test DataSource for e2e tests using environment variables
 */
export function createTestDataSource(): DataSource {
    const {
        TEST_DB_HOST = '127.0.0.1',
        TEST_DB_PORT = '15306',
        TEST_DB_USERNAME = 'gsheets_admin',
        TEST_DB_PASSWORD = 'gsheetsAdminPassword',
        TEST_DB_NAME = 'e2e-tests',
    } = process.env

    return new DataSource({
        type: 'mysql',
        host: TEST_DB_HOST,
        port: parseInt(TEST_DB_PORT),
        username: TEST_DB_USERNAME,
        password: TEST_DB_PASSWORD,
        database: TEST_DB_NAME,
        entities: [User],
        migrations: ['src/migrations/*.ts'],
        synchronize: false,
        dropSchema: false,
    })
}

/**
 * Test module that uses a real database for e2e tests
 */
@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        TypeOrmModule.forRootAsync({
            useFactory: () => {
                const dataSource = createTestDataSource()
                return dataSource.options
            },
        }),
        AppModule,
    ],
    providers: [
        {
            provide: ExtensionVerificationGuard,
            useValue: { canActivate: () => true },
        },
    ],
})
export class TestAppModule {}
