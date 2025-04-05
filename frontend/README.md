# Business Intelligence Frontend

This is a shell frontend for the Business Intelligence coding challenge. It's a React application built with TypeScript
and Vite.

You are not expected to complete this app... there are many pieces missing and you can work on any part that you think
will demonstrate your abilities and knowledge.

Some stuff you might choose to work on to show off your skills (you are not limited to this):

* Finish the login screen that interacts with an auth endpoint
    * Bonus points if it supports "login with Google"
* Write some code for sending SQL in a request, getting rows as a response.. managing that state
* Display the rows it in a table with alternating light/dark background color for each row
    * Bonus points if the user can display data in more than just tabular format
    * Bonus points if the table is sortable by clicking on a column heading
* Make the SQL editor component that just lets someone type SQL
    * Bonus points if it does SQL formatting and/or colorizing
* Deal with and display error responses, we aren't prescriptive about how to display, show off some UX design here
* Use the Avise color palette as seen in the images under the UX directory and update the CSS to match

## Setup

### Installation

```bash
pnpm install
```

### Development

```bash
pnpm run dev
```

This will start the development server at http://localhost:5173 (or another port if 5173 is in use).

### Build

```bash
pnpm run build
```

This will create a production build in the `dist` directory.

### Lint

```bash
pnpm run lint
```

## Technologies

- React 19
- TypeScript
- Vite 6

## Features to Implement

This application should allow users to:

1. Log in with email/password or Google Auth
2. Create and run SQL queries against a database
3. View results in different formats (table, JSON, CSV, Google Sheet)
4. Export results to different formats
