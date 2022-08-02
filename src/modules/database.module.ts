import { getBaseConfigurationWithDatabase, UserDatabaseService } from '@doist/ui-extensions-server'

import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'

import { User } from '../entities/user.entity'

@Module({
    imports: [
        TypeOrmModule.forRoot({
            ...getBaseConfigurationWithDatabase().database,
            type: 'mysql',
            entities: [User],
            synchronize: false,
            migrations: ['dist/migrations/*.js'],
            migrationsRun: true,
            charset: 'utf8mb4',
        }),
        TypeOrmModule.forFeature([User]),
    ],
    providers: [UserDatabaseService],
    exports: [UserDatabaseService, TypeOrmModule],
})
export class DatabaseModule {}
