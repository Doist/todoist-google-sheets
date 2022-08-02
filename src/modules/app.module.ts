import { CoreModule } from '@doist/ui-extensions-server'

import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'

@Module({
    imports: [
        ConfigModule.forRoot({
            envFilePath: ['.env'],
        }),
        CoreModule,
    ],
})
export class AppModule {}
