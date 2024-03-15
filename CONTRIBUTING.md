# CRISP Developer Guide

Welcome to the CRISP (Classroom Repository Interaction and Status Platform) developer guide. We appreciate your interest in contributing to our project! This guide will help you get started with setting up the project, making changes, and submitting those changes for review.

## Getting Started

Before you begin, make sure you have the following installed:

- **Git**: For version control
- **Node.js**: JavaScript runtime (use Node 18 LTS or later)
- **npm** or **Yarn**: Package manager to install dependencies
- **MongoDB**: Our chosen database

Familiarize yourself with the technologies we use:

- **Git** and **GitHub**
- **Node.js**
- **TypeScript**
- **MongoDB**
- **Next.js (TypeScript)**

## Repo Structure

The CRISP repo is structured as follows:

- **/multi-git-dashboard**: Contains the source code for the CRISP web application.
- **/backend**: Contains the server-side code that provides APIs and interacts with databases.

## Development Setup

1. **Fork the Repository**: Start by forking the CRISP repository to your own GitHub account.

2. **Clone Your Fork**: Clone your fork to your local machine:
    ```bash
    git clone https://github.com/<your-username>/CRISP.git
    ```

3. **Install Dependencies**: Navigate to both the frontend and backend directories and install the necessary packages using npm
    ```bash
    cd CRISP/multi-git-dashboard
    npm install

    cd ../backend
    npm install
    ```

4. **Environment Setup**: Set up your local environment by creating .env files in the frontend and backend directories. Use the .env.example as a template.

5. **Run the Development Servers**: For the frontend and backend, run the development servers:
    ```bash
    // For multi-git-dashboard
    npm run dev

    // For backend
    npm run dev
    ```

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

Once you're ready to share your contributions, follow these steps to submit a Pull Request using the forking workflow:

1. **Create a New Branch**: Create a new branch for your changes based on the main branch on your GitHub fork.

    ```bash
    git checkout -b feature/my-new-feature main
    ```

2. **Make Your Changes**: Implement your feature or fix and commit your changes using the provided format.

3. **Keep Your Branch Updated**: Regularly pull the latest changes from the upstream repository and merge them into your branch to keep it up to date.

    ```bash
    git fetch upstream
    git rebase upstream/main
    ```

4. **Push Your Changes**: Push your branch and changes to your GitHub fork.

    ```bash
    git push origin feature/my-new-feature
    ```

5. **Open a Pull Request (PR)**: Go to your fork on GitHub and create a new Pull Request against the `staging` branch of the upstream repository. Make sure to fill out the [PR template](https://github.com/NUS-CRISP/CRISP/blob/main/pull_request_template.md) with the necessary details.

## Code of Conduct

## Seeking Help

If you need help or have any questions, feel free to raise an issue on the GitHub issue tracker.

## License

None at the moment

Happy coding, and we look forward to your contributions!
