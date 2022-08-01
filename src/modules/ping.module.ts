import { PingController } from '@doist/ui-extensions-server'

import { Module } from '@nestjs/common'

@Module({
    controllers: [PingController],
})
export class PingModule {}
