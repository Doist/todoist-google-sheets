export enum Sheets {
    ALWAYS_EXPORTED = 'The following fields are always exported: Task Id, Task Name, Section Id, and Parent Task Id.',
    EXPORT_BUTTON = 'Export',
    EXPORT_COMPLETED = 'Export completed',
    HELP_CENTER_LINK = 'https://get.todoist.help/hc/requests/new?subject=Export%20to%20Google%20Sheets',
    LEARN_MORE_LINK = 'https://todoist.com/help/TBD',
    LOGIN_INSTRUCTIONS = 'You need to connect this integration to your Google account to use it. ',
    LOGIN_SUCCESSFUL = 'Successfully logged into Google',
    LOGIN_TITLE = 'Did you already authenticate with your Google account?',
    MAIN_TITLE = 'Export **{0}**', // {0} is the project name
    NO_TASKS = '**{0}** has no tasks to export', // {0} is the project name
    OPTIONS_HEADER = 'Choose which fields you want to export.',
    PROFILE_DETAILS_WITH_NAME = 'You’re connected to Google as **{0}** ({1}).',
    PROFILE_DETAILS_WITH_NO_NAME = 'You’re connected to Google as **{0}**.',
    SHEET_TITLE = 'Todoist Export: {0} from {1}', // {0} is the project name, {1} is the date
    VIEW_SHEET = 'View sheet',
}

export enum Options {
    COMPLETED = 'Is completed',
    DUE = 'Due date',
    PRIORITY = 'Priority',
    DESCRIPTION = 'Description',
    PARENT_TASK = 'Parent task',
    SECTION = 'Section',
    ASSIGNEE = 'Assignee',
    CREATED_DATE = 'Created date',
}
