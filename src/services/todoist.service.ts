import { Section, TodoistApi, User } from '@doist/todoist-api-typescript'

import { HttpService } from '@nestjs/axios'
import { Injectable, Logger } from '@nestjs/common'
import { lastValueFrom } from 'rxjs'

import type { Task } from '../types'

const LIMIT = 100

/**
 * The v1 by_completion_date endpoint enforces a maximum date range of 3 months.
 * We use 90-day windows to stay within this limit while fetching all
 * historical completed tasks by walking backwards from today.
 */
const MAX_WINDOW_DAYS = 90

/**
 * A date predating Todoist's existence (founded 2007), used as the lower
 * bound when walking backwards through date windows to ensure all
 * historical completed tasks are included.
 */
const EARLIEST_DATE = new Date('2006-01-01T00:00:00Z')

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
    items: SyncTask[]
    next_cursor?: string | null
}

@Injectable()
export class TodoistService {
    private readonly logger = new Logger(TodoistService.name)

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
            this.logger.error('Failed to fetch completed tasks', {
                projectId,
                taskId,
                sectionId,
                error: error instanceof Error ? error.message : error,
            })
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
            this.logger.error('Failed to fetch completed_info from Sync API', {
                error: error instanceof Error ? error.message : error,
            })
            return []
        }
    }

    /**
     * Fetches completed tasks using the documented Todoist API v1 endpoint.
     *
     * The by_completion_date endpoint enforces a maximum date range of 3 months,
     * so we walk backwards from today in 90-day windows until we reach
     * EARLIEST_DATE (2006) to ensure all historical completed tasks are included.
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

        for (const { since, until } of this.generateDateWindows()) {
            const windowItems = await this.fetchCompletedTasksForWindow({
                token,
                since,
                until,
                projectId,
                taskId,
                sectionId,
            })
            allItems.push(...windowItems)
        }

        return allItems
    }

    /**
     * Generates date windows walking backwards from today to EARLIEST_DATE,
     * each at most MAX_WINDOW_DAYS long.
     */
    private *generateDateWindows(): Generator<{ since: string; until: string }> {
        let windowEnd = new Date()
        const earliest = EARLIEST_DATE

        while (windowEnd > earliest) {
            const windowStart = new Date(
                windowEnd.getTime() - MAX_WINDOW_DAYS * 24 * 60 * 60 * 1000,
            )
            const effectiveStart = windowStart < earliest ? earliest : windowStart

            yield {
                since: effectiveStart.toISOString(),
                until: windowEnd.toISOString(),
            }

            windowEnd = effectiveStart
        }
    }

    private async fetchCompletedTasksForWindow({
        token,
        since,
        until,
        projectId,
        taskId,
        sectionId,
    }: {
        token: string
        since: string
        until: string
        projectId?: string
        taskId?: string
        sectionId?: string
    }): Promise<SyncTask[]> {
        const windowItems: SyncTask[] = []
        let nextCursor: string | null = null

        do {
            const data: { items: SyncTask[]; nextCursor: string | null } = await this.fetchCompletedTasksPage({
                token,
                since,
                until,
                projectId,
                taskId,
                sectionId,
                cursor: nextCursor,
            })

            windowItems.push(...data.items)
            nextCursor = data.nextCursor
        } while (nextCursor)

        return windowItems
    }

    private async fetchCompletedTasksPage(params: {
        token: string
        since: string
        until: string
        projectId?: string
        taskId?: string
        sectionId?: string
        cursor: string | null
    }): Promise<{ items: SyncTask[]; nextCursor: string | null }> {
        const { token, since, until, projectId, taskId, sectionId, cursor } = params
        const response = await lastValueFrom(
            this.httpService.get<CompletedTasksResponse>(
                'https://api.todoist.com/api/v1/tasks/completed/by_completion_date',
                {
                    headers: { Authorization: `Bearer ${token}` },
                    params: {
                        limit: LIMIT,
                        since,
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
            items: response.data.items ?? [],
            nextCursor: response.data.next_cursor ?? null,
        }
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
