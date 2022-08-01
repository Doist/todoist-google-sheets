import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'

import { PingModule } from './ping.module'

@Module({
    imports: [
        ConfigModule.forRoot({
            envFilePath: ['.env'],
        }),
        PingModule,
    ],
})
export class AppModule {}
