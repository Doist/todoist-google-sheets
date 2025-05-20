import type { Task as RestTask } from '@doist/todoist-api-typescript'

/**
 * Custom delimiter rather than using a comma as task content/descriptions
 * could contain commas. Chosen something that is almost certainly never
 * going to appear in a task content/description.
 */
export const DELIMITER = '...---...'

export const ExportOptionsNames = [
    'completed',
    'due',
    'priority',
    'description',
    'parentTask',
    'section',
    'assignee',
    'createdDate',
    'labels',
] as const

export const NonOptionalExportOptionsNames = [
    'taskId',
    'taskName',
    'sectionId',
    'parentTaskId',
] as const

export type ExportOptions = (typeof ExportOptionsNames)[number]

export type ExportOptionsToUse = Record<ExportOptions, boolean> & {
    includeCompleted: boolean
}

export type Task = Omit<RestTask, 'url'> & {
    completedAt?: string
}
