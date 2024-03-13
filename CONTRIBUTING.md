# CRISP Developer Guide

Welcome to the CRISP (Classroom Repository Interaction and Status Platform) developer guide. We appreciate your interest in contributing to our project! This guide will help you get started with setting up the project, making changes, and submitting those changes for review.

## Getting Started

Before you begin, make sure you have the following installed:

- Git: For version control
- Node.js: JavaScript runtime (use Node 18 LTS or later)
- npm or Yarn: Package manager to install dependencies

Familiarize yourself with the technologies we use:

- Git and GitHub
- Node.js
- TypeScript

## Repo Structure

The CRISP repo is structured as follows:

- /multi-git-dashboard: Contains the source code for the CRISP web application.
- /backend: Contains the server-side code that provides APIs and interacts with databases.

## Development Setup

1. Fork the Repository: Start by forking the CRISP repository to your own GitHub account.

2. Clone Your Fork: Clone your fork to your local machine:
```bash
git clone https://github.com/<your-username>/CRISP.git
```

3. Install Dependencies: Navigate to both the frontend and backend directories and install the necessary packages using npm
```bash
cd CRISP/multi-git-dashboard
npm install

cd ../backend
npm install
```

4. Environment Setup: Set up your local environment by creating .env files in the frontend and backend directories. Use the .env.example as a template.

5. Run the Development Servers: For the frontend and backend, run the development servers:
```bash
// For multi-git-dashboard
npm run dev

// For backend
npm run dev
```

## Workflow

## Commits

Write clear and detailed commit messages. A commit message consists of a header, a body, and a footer. The header has a special format that includes a type, a scope, and a subject:

```
<type>(<scope>): <short summary>

<body>

<footer>
```

Example commit message:

```
feat(authentication): implement OAuth2 login flow

Implemented the OAuth2 login flow using the passport library. This includes
routes for redirecting to the OAuth provider, callback routes, and user session
management.

Resolves #123
```

## Pull Requests (PRs)
When you're ready to submit your work, push your branch to GitHub and create a Pull Request against the main branch of the original repository.

A PR message template is provided below for your convenience:

```
## Description

Briefly describe the changes you've made. Include any relevant issues or context necessary for understanding the changes.

## Changes

- List your changes as bullet points
- Include technical details or decisions if necessary

## Screenshots (if applicable)

Include any relevant screenshots or GIFs that demonstrate your changes visually.

## Additional Notes

Include any additional comments or context.

Resolves #<issue_number>
```

## Code of Conduct

## Seeking Help

If you need help or have any questions, feel free to raise an issue on the GitHub issue tracker, or reach out on our community chat.

## License

None

Happy coding, and we look forward to your contributions!
