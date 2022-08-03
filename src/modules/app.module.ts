import { CoreModule } from '@doist/ui-extensions-server'

import { Module } from '@nestjs/common'

import { ConfigurationModule } from './configuration.module'
import { DatabaseModule } from './database.module'

@Module({
    imports: [ConfigurationModule, CoreModule, DatabaseModule],
})
export class AppModule {}
