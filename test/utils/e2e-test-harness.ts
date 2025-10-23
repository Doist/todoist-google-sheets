import { User } from '../../src/entities/user.entity'

import type { DataSource } from 'typeorm'

/**
 * Clean all data from test database tables
 */
export async function cleanTestDatabase(dataSource: DataSource): Promise<void> {
    const userRepository = dataSource.getRepository(User)
    await userRepository.clear()
}

/**
 * Run all migrations on the test database
 */
export async function runTestDatabaseMigrations(dataSource: DataSource): Promise<void> {
    await dataSource.runMigrations()
}

/**
 * Factory for creating test data
 */
export class TestDataFactory {
    constructor(private dataSource: DataSource) {}

    async createUser(props: Partial<User> = {}): Promise<User> {
        const userRepository = this.dataSource.getRepository(User)
        const user = userRepository.create({
            twistId: props.twistId ?? Math.floor(Math.random() * 1000000),
            authToken: props.authToken ?? 'test-auth-token',
            refreshToken: props.refreshToken ?? 'test-refresh-token',
            externalUserId: props.externalUserId ?? String(Math.floor(Math.random() * 1000000)),
            emailAddress: props.emailAddress ?? 'test@example.com',
            name: props.name ?? 'Test User',
            ...props,
        })
        return await userRepository.save(user)
    }

    async getUser(twistId: number): Promise<User | null> {
        const userRepository = this.dataSource.getRepository(User)
        return await userRepository.findOneBy({ twistId })
    }

    async deleteUser(twistId: number): Promise<void> {
        const userRepository = this.dataSource.getRepository(User)
        await userRepository.delete({ twistId })
    }
}
