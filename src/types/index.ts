export const ExportOptionsNames = [
    'completed',
    'due',
    'priority',
    'description',
    'parentTask',
    'section',
    'assignee',
    'createdDate',
] as const

export const NonOptionalExportOptionsNames = [
    'taskId',
    'content',
    'sectionId',
    'parentTaskId',
] as const

export type ExportOptions = typeof ExportOptionsNames[number]

export type ExportOptionsToUse = Record<ExportOptions, boolean>
