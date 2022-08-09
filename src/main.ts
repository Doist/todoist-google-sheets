import { join } from 'path'

import { bootstrap } from '@doist/ui-extensions-server'

import { AppModule } from './modules/app.module'

bootstrap(AppModule, { useStaticAssets: { path: join(__dirname, '../public') } }).finally(() => {
    // To satisfy eslint `no-void` rule.
    // Rejects if server could not start, nothing we can do.
    // Sentry might not be initialized yet.
})
