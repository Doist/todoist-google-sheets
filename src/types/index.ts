export const ExportOptionsNames = [
    'content',
    'completed',
    'due',
    'priority',
    'description',
    'parentTask',
    'section',
    'author',
    'assignee',
    'createdDate',
    'timezone',
] as const

export type ExportOptions = typeof ExportOptionsNames[number]
