import { ExtensionVerificationGuard } from '@doist/ui-extensions-server'

import { Test } from '@nestjs/testing'

import { AppModule } from './app.module'

import type { NestExpressApplication } from '@nestjs/platform-express'

async function createTestApp(): Promise<{
    appModule: NestExpressApplication
}> {
    const moduleRef = await Test.createTestingModule({
        imports: [AppModule],
    })
        .overrideGuard(ExtensionVerificationGuard)
        .useValue({ canActivate: () => true })
        .compile()

    const app = moduleRef.createNestApplication<NestExpressApplication>()

    return { appModule: await app.init() }
}

describe('AppModule', () => {
    let app: NestExpressApplication

    afterEach(() => jest.restoreAllMocks())

    afterAll(() => app.close())

    it('runs the server without crashing', async () => {
        const { appModule } = await createTestApp()

        app = appModule

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const server = app.getHttpServer()

        expect(server).toBeDefined()
    })
})
