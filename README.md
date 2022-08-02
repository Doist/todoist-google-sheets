# Todoist: Export to Google Sheets

UI Extension for Todoist that exports projects to Google Sheets

## Running it All

After you pull the code, do the following actions to start the backend component:

1. Copy `example.env` to `.env` and ensure the values have been filled in correctly (see below)
2. `npm install`
3. `npm run start:dev`

This should yield a backend running at `http://localhost:3000`

## Local environment variables

To tailor your dev environment, create a `.env` file and put in the relevant settings:

-   `PORT`: The port the backend will run on
-   `BASE_URL`: This is the domain for accessing static files (like images)
-   `VERIFICATION_TOKENS`: This is the comma-separated list of valid tokens the integration will require to validate when it's called.
-   `DB_HOST`: Database host
-   `DB_PORT`: Database port
-   `DB_USERNAME`: Database username
-   `DB_PASSWORD`: Database password
-   `DB_ENCRYPTION_KEY`: The db is encrypting sensitive columns, provide the key here.
-   `DB_ENCRYPTION_ALGORITHM`: The algorithm used for the encryption.
-   `DB_ENCRYPTION_IV_LENGTH`: The length of the initialization vector used by the encryption.

### Migrations

If the database model changes, you need to create a new migration.

First, install ts-node globally:

`npm install -g ts-node`

You can then run `npm run typeorm migration:create -- -d migrations -n <Name of the migration>`
This will create an empty migration in the `migrations` folder. You can go ahead and edit it there. The migrations are run at app start (this is set up via the Typeorm module in app.module.ts)

There's also the option to let typeorm generate the migration for you automatically. In this case,
you need an `ormconfig.json` file with all the connection details for the typeorm CLI to connect to the DB,
and instead of `migration:create`, use the `migration:generate` command.
For more information, visit https://typeorm.io/#/migrations

## Accessing your extension

You will need to use something like [ngrok](https://ngrok.com/), or [localtunnel](http://localtunnel.github.io/www/), in order for Todoist to be able to access your backend. Whichever service you use, the resulting URL is what should be used in the `BASE_URL` setting. It will also be what you add to your UI Extension in your integration at the [App Console](https://todoist.com/app_console). For this extension it will be `<Your Base URL>/process`.
