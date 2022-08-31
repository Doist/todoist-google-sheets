import {
    ActionsService,
    AppController as AppControllerBase,
    AppTokenService,
    GoogleAnalyticsService,
    ThemeService,
} from '@doist/ui-extensions-server'

import { Controller } from '@nestjs/common'

@Controller()
export class AppController extends AppControllerBase {
    constructor(
        themeService: ThemeService,
        analyticsService: GoogleAnalyticsService,
        protected override readonly actionsService: ActionsService,
        appTokenService: AppTokenService,
    ) {
        super(analyticsService, themeService, actionsService, appTokenService)
    }
}
