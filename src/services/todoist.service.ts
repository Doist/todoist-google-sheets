import { HttpService } from '@nestjs/axios'
import { Injectable } from '@nestjs/common'
import { lastValueFrom } from 'rxjs'

import type { Task } from '../types'

const LIMIT = 100

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

    // not exportable at the moment
    // so hardcoding to null
    deadline: null
    duration: null
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
        projectId,
        token,
        cursor,
    }: {
        token: string
        projectId: string
        cursor?: string
    }): Promise<SyncTask[]> {
        const response = await lastValueFrom(
            this.httpService.get<{
                has_more: boolean
                next_cursor?: string
                items: SyncTask[]
            }>(
                // this endpoint is not publicly documented.
                // we should eventually move to one of the Todoist API v1 endpoints
                // for fetching completed tasks (e.g `/tasks/completed/by_parent`).
                // we're only using this endpoint because at the moment (April 2025),
                // the v1 endpoints do not return data for unjoined projects.
                'https://api.todoist.com/api/v9.223/archive/items',
                {
                    headers: { Authorization: `Bearer ${token}` },
                    params: {
                        limit: LIMIT,
                        project_id: projectId,
                        ...(cursor ? { cursor } : {}),
                    },
                },
            ),
        )

        const { data } = response
        const tasks = data.items

        if (data.has_more && data.next_cursor) {
            return tasks.concat(
                await this.getCompletedTasksInternal({
                    token,
                    projectId,
                    cursor: data.next_cursor,
                }),
            )
        }

        return tasks
    }

    private getTaskFromQuickAddResponse(responseData: SyncTask): Task {
        const due: Task['due'] = responseData.due
            ? {
                  isRecurring: responseData.due.is_recurring,
                  string: responseData.due.string,
                  date: responseData.due.date,
                  ...(responseData.due.timezone !== null && { datetime: responseData.due.date }),
                  ...(responseData.due.timezone !== null && {
                      timezone: responseData.due.timezone,
                  }),
              }
            : null

        return {
            id: responseData.id,
            order: responseData.child_order,
            content: responseData.content,
            description: responseData.description,
            projectId: responseData.project_id,
            sectionId: responseData.section_id,
            isCompleted: responseData.checked,
            labels: responseData.labels,
            priority: responseData.priority,
            createdAt: responseData.added_at,
            creatorId: responseData.added_by_uid,
            parentId: responseData.parent_id ?? null,
            assigneeId: responseData.responsible_uid ?? null,
            assignerId: responseData.assigned_by_uid ?? null,
            completedAt: responseData.completed_at,
            due,
            deadline: responseData.deadline,
            duration: responseData.duration,
        }
    }
}
