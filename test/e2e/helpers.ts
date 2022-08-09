import { ExtensionVerificationGuard, registerViews, User } from '@doist/ui-extensions-server'

import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'

import { AppModule } from '../../src/modules/app.module'
import { mockConnection } from '../mocks'

import type { NestExpressApplication } from '@nestjs/platform-express'

export async function createTestApp(): Promise<{
    appModule: NestExpressApplication
}> {
    const moduleRef = await Test.createTestingModule({
        imports: [AppModule],
    })
        .overrideProvider(DataSource)
        .useValue(mockConnection())
        .overrideProvider(getRepositoryToken(User))
        .useValue(jest.fn())
        .overrideGuard(ExtensionVerificationGuard)
        .useValue({ canActivate: () => true })
        .compile()

    const app = moduleRef.createNestApplication<NestExpressApplication>()

    await registerViews(app)

    return { appModule: await app.init() }
}
