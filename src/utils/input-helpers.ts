import { type ExportOptions, ExportOptionsNames } from '../types'

import type { DoistCardActionInputs } from '@doist/ui-extensions-core'

export function getExportOptions(inputs?: DoistCardActionInputs) {
    const options = {} as Record<ExportOptions, boolean>
    if (inputs) {
        ExportOptionsNames.forEach((option) => {
            const id = `Input.${option}`
            const isSelected = inputs[id] === 'true'
            options[option] = isSelected
        })
    }
    return options
}
