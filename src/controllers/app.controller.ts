import {
    ActionsService,
    AppController as AppControllerBase,
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
    ) {
        super(analyticsService, themeService, actionsService)
    }
}
