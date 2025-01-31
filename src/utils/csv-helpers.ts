import {
    DELIMITER,
    ExportOptionsNames,
    ExportOptionsToUse,
    NonOptionalExportOptionsNames,
    Task,
} from '../types'

import type { Section, User as Collaborator } from '@doist/todoist-api-typescript'

type Props = {
    tasks: Task[]
    sections: Section[]
    collaborators: Collaborator[]
    exportOptions: ExportOptionsToUse
}

export function convertTasksToCsvString({
    tasks,
    sections,
    collaborators,
    exportOptions,
}: Props): string {
    const rows: string[] = [createHeaderRow(exportOptions)]
    tasks.forEach((task) =>
        rows.push(
            createTaskRow({
                task,
                exportOptions,
                tasks,
                collaborators,
                sections,
            }),
        ),
    )
    return rows.join('\n')
}

function createHeaderRow(exportOptions: ExportOptionsToUse): string {
    const items: string[] = [...NonOptionalExportOptionsNames]

    ExportOptionsNames.forEach((option) => {
        if (exportOptions[option]) {
            items.push(option)
        }
    })

    if (exportOptions.includeCompleted) {
        items.push('completedDate')
    }

    return items.join(DELIMITER)
}

type CreateTaskRowArgs = {
    task: Task
    exportOptions: ExportOptionsToUse
    tasks: Task[]
    sections: Section[]
    collaborators: Collaborator[]
}

function createTaskRow({ task, exportOptions, tasks, collaborators, sections }: CreateTaskRowArgs) {
    const items: string[] = []

    NonOptionalExportOptionsNames.forEach((option) => {
        switch (option) {
            case 'taskId':
                items.push(task.id.toString())
                break
            case 'taskName':
                items.push(sanitiseText(task.content))
                break
            case 'sectionId':
                items.push(task.sectionId ?? '')
                break
            case 'parentTaskId':
                items.push(task.parentId ?? '')
                break
        }
    })

    ExportOptionsNames.forEach((option) => {
        if (!exportOptions[option]) {
            return
        }

        switch (option) {
            case 'completed':
                items.push(task.isCompleted ? 'true' : 'false')
                break
            case 'due':
                items.push(task.due?.string ?? '')
                break
            case 'priority':
                // Todoist API returns a high priority as '4', but we want to display it as '1' as that
                // will be what the user expects.
                items.push(String(5 - task.priority))
                break
            case 'description':
                items.push(task.description ? sanitiseText(task.description) : '')
                break
            case 'parentTask':
                items.push(task.parentId ? getParentTaskName(task.parentId, tasks) : '')
                break
            case 'section':
                items.push(task.sectionId ? getSectionName(task.sectionId, sections) : '')
                break
            case 'assignee':
                items.push(
                    task.assigneeId ? getCollaboratorName(task.assigneeId, collaborators) : '',
                )
                break
            case 'createdDate':
                items.push(task.createdAt)
                break
        }
    })

    if (exportOptions.includeCompleted) {
        items.push(task.completedAt ?? '')
    }

    return items.join(DELIMITER)
}

function getParentTaskName(parentTaskId: string, tasks: Task[]): string {
    const task = tasks.find((x) => x.id === parentTaskId)
    return task?.content ? sanitiseText(task.content) : ''
}

function getSectionName(sectionId: string, sections: Section[]): string {
    const section = sections.find((x) => x.id === sectionId)
    return section?.name ? sanitiseText(section.name) : ''
}

function getCollaboratorName(collaboratorId: string, collaborators: Collaborator[]): string {
    const collaborator = collaborators.find(({ id }) => id === collaboratorId)
    const collaboratorName = collaborator?.name ? sanitiseText(collaborator.name) : undefined

    return collaboratorName ? `${collaboratorName} (${collaboratorId})` : collaboratorId
}

function sanitiseText(description: string): string {
    return description.replace(/\n/g, ' ')
}
