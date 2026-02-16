import { Section, TodoistApi, User } from '@doist/todoist-api-typescript'

import { HttpService } from '@nestjs/axios'
import { Injectable } from '@nestjs/common'
import { lastValueFrom } from 'rxjs'

import type { Task } from '../types'

const LIMIT = 100

/**
 * A date predating Todoist's existence (founded 2007), used as the `since`
 * parameter when fetching completed tasks from the v1 API to ensure all
 * historical completed tasks are included.
 */
const COMPLETED_TASKS_SINCE = '2006-01-01T00:00:00Z'

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

export type CompletedInfo = {
    item_id?: string
    project_id?: string
    section_id?: string
    completed_items: number
}

type CompletedTasksResponse = {
    has_more: boolean
    next_cursor: string | null
    items: SyncTask[]
}

@Injectable()
export class TodoistService {
    constructor(private readonly httpService: HttpService) {}

    async getProjectTasks(params: { token: string; projectId: string }): Promise<Task[]> {
        const { token, projectId } = params
        const todoistClient = new TodoistApi(token)

        return this.fetchAllPages<Task>((cursor) =>
            todoistClient.getTasks({
                projectId,
                ...(cursor ? { cursor } : {}),
            }),
        )
    }

    async getProjectSections(params: { token: string; projectId: string }): Promise<Section[]> {
        const { token, projectId } = params
        const todoistClient = new TodoistApi(token)

        return this.fetchAllPages<Section>((cursor) =>
            todoistClient.getSections({
                projectId,
                ...(cursor ? { cursor } : {}),
            }),
        )
    }

    async getProjectCollaborators(params: { token: string; projectId: string }): Promise<User[]> {
        const { token, projectId } = params
        const todoistClient = new TodoistApi(token)

        return this.fetchAllPages<User>((cursor) =>
            todoistClient.getProjectCollaborators(projectId, {
                ...(cursor ? { cursor } : {}),
            }),
        )
    }

    private async fetchAllPages<T>(
        fetchFn: (cursor?: string | null) => Promise<{ results: T[]; nextCursor: string | null }>,
    ): Promise<T[]> {
        let allResults: T[] = []
        let nextCursor: string | null | undefined = undefined

        do {
            const response: { results: T[]; nextCursor: string | null } = await fetchFn(nextCursor)

            allResults = [...allResults, ...response.results]
            nextCursor = response.nextCursor
        } while (nextCursor !== null)

        return allResults
    }

    async getCompletedTasks({
        projectId,
        token,
        taskId,
        sectionId,
    }: {
        token: string
        projectId?: string
        taskId?: string
        sectionId?: string
    }): Promise<Task[]> {
        try {
            const items = await this.getCompletedTasksInternal({
                token,
                projectId,
                taskId,
                sectionId,
            })

            return items.map((task) => this.getTaskFromQuickAddResponse(task))
        } catch (error: unknown) {
            return []
        }
    }

    /**
     * Fetches completed_info from the Todoist Sync API (v1).
     *
     * completed_info indicates the number of completed items within each
     * active project, section, or parent item. This is used to determine
     * which tasks and sections have completed children that need to be
     * fetched separately.
     *
     * @see https://developer.todoist.com/api/v1/#tag/Sync/Overview/Read-resources
     */
    async getCompletedInfo({ token }: { token: string }): Promise<CompletedInfo[]> {
        try {
            const response = await lastValueFrom(
                this.httpService.post<{ completed_info: CompletedInfo[] }>(
                    'https://api.todoist.com/api/v1/sync',
                    { sync_token: '*', resource_types: '["completed_info"]' },
                    { headers: { Authorization: `Bearer ${token}` } },
                ),
            )

            return response.data.completed_info
        } catch (error: unknown) {
            return []
        }
    }

    /**
     * Fetches completed tasks using the documented Todoist API v1 endpoint.
     *
     * Uses a wide date range (since 2006) to fetch all completed tasks,
     * effectively replicating the behavior of the previous undocumented
     * archive/items endpoint.
     *
     * @see https://developer.todoist.com/api/v1/#tag/Tasks/operation/getTasks_Completed_By_Completion_Date
     */
    private async getCompletedTasksInternal({
        projectId,
        token,
        taskId,
        sectionId,
    }: {
        token: string
        projectId?: string
        taskId?: string
        sectionId?: string
    }): Promise<SyncTask[]> {
        const allItems: SyncTask[] = []
        const until = new Date().toISOString()

        const fetchPage = async (
            cursor?: string | null,
        ): Promise<{
            results: SyncTask[]
            nextCursor: string | null
        }> => {
            const response = await lastValueFrom(
                this.httpService.get<CompletedTasksResponse>(
                    'https://api.todoist.com/api/v1/tasks/completed/by_completion_date',
                    {
                        headers: { Authorization: `Bearer ${token}` },
                        params: {
                            limit: LIMIT,
                            since: COMPLETED_TASKS_SINCE,
                            until,
                            ...(projectId ? { project_id: projectId } : {}),
                            ...(taskId ? { parent_id: taskId } : {}),
                            ...(sectionId ? { section_id: sectionId } : {}),
                            ...(cursor ? { cursor } : {}),
                        },
                    },
                ),
            )

            return {
                results: response.data.items,
                nextCursor: response.data.has_more ? response.data.next_cursor : null,
            }
        }

        let nextCursor: string | null | undefined = undefined

        do {
            const pageResult: { results: SyncTask[]; nextCursor: string | null } = await fetchPage(
                nextCursor,
            )

            allItems.push(...pageResult.results)
            nextCursor = pageResult.nextCursor
        } while (nextCursor !== null)

        return allItems
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
