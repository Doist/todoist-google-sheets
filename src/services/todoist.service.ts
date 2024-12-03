import { HttpService } from '@nestjs/axios'
import { Injectable } from '@nestjs/common'
import { lastValueFrom } from 'rxjs'

import type { Task } from '../types'

const LIMIT = 200

type SyncDue = {
    date: string
    is_recurring: boolean
    lang: string
    string: string
    timezone?: string | null
}

export type SyncTask = {
    added_by_uid: string
    assigned_by_uid?: string
    checked: boolean
    child_order: number
    collapsed: boolean
    content: string
    added_at: string
    completed_at: string
    description: string
    id: string
    is_deleted: boolean
    labels: string[]
    parent_id?: string | null
    priority: number
    project_id: string
    responsible_uid?: string | null
    section_id: string
    user_id: string
    due?: SyncDue | null
}

type CompletedTasksResponse = {
    items: SyncTask[]
    total: number
    next_cursor?: string
}

@Injectable()
export class TodoistService {
    constructor(private readonly httpService: HttpService) {}

    async getCompletedTasks({
        projectId,
        token,
    }: {
        token: string
        projectId: string
    }): Promise<Task[]> {
        const completedTasks = await this.getCompletedTasksInternal({ token, projectId })

        return completedTasks.map((task) => this.getTaskFromQuickAddResponse(task))
    }

    private async getCompletedTasksInternal({
        cursor,
        projectId,
        token,
    }: {
        token: string
        cursor?: string
        projectId: string
    }): Promise<SyncTask[]> {
        const response = await lastValueFrom(
            this.httpService.get<CompletedTasksResponse>(
                'https://api.todoist.com/sync/v9/tasks/archived',
                {
                    params: {
                        project_id: projectId,
                        cursor,
                        limit: LIMIT,
                    },
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                },
            ),
        )

        const { items: tasks, next_cursor } = response.data

        if (tasks.length === LIMIT) {
            return tasks.concat(
                await this.getCompletedTasksInternal({ token, cursor: next_cursor, projectId }),
            )
        }

        return tasks
    }

    private getTaskFromQuickAddResponse(responseData: SyncTask): Task {
        const due = responseData.due
            ? {
                  isRecurring: responseData.due.is_recurring,
                  string: responseData.due.string,
                  date: responseData.due.date,
                  ...(responseData.due.timezone !== null && { datetime: responseData.due.date }),
                  ...(responseData.due.timezone !== null && {
                      timezone: responseData.due.timezone,
                  }),
              }
            : undefined

        const task: Task = {
            id: responseData.id,
            order: responseData.child_order,
            content: responseData.content,
            description: responseData.description,
            projectId: responseData.project_id,
            sectionId: responseData.section_id ? responseData.section_id : undefined,
            isCompleted: responseData.checked,
            labels: responseData.labels,
            priority: responseData.priority,
            commentCount: 0, // Will always be 0 for a quick add
            createdAt: responseData.added_at,
            creatorId: responseData.added_by_uid,
            ...(responseData.parent_id !== null && { parentId: responseData.parent_id }),
            ...(responseData.responsible_uid !== null && {
                assigneeId: responseData.responsible_uid,
            }),
            completedAt: responseData.completed_at,
            due,
        }

        return task
    }
}
