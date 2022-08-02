/**
 * This file is only required for generating migrations, it shouldn't need to be touched, ever.
 */
import { cwd, env } from 'process'

import * as dotenv from 'dotenv'
import { DataSource } from 'typeorm'

dotenv.config()

export const dataSource = new DataSource({
    type: 'mysql',
    host: env.DB_HOST,
    port: parseInt(env.DB_PORT as string),
    username: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    entities: [cwd() + '/src/**/*.entity.ts'],
    migrations: [cwd() + '/src/migrations/*.ts'],
    migrationsTableName: 'migrations',
    synchronize: false,
    dropSchema: false,
})
