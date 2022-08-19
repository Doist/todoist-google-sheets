import { ExportOptionsNames, ExportOptionsToUse } from '../types'

import type { DoistCardActionInputs } from '@doist/ui-extensions-core'

export function getExportOptions(inputs?: DoistCardActionInputs): ExportOptionsToUse {
    const options = {} as ExportOptionsToUse
    if (inputs) {
        ExportOptionsNames.forEach((option) => {
            const id = `Input.${option}`
            const isSelected = inputs[id] === 'true'
            options[option] = isSelected
        })
    }
    return options
}
