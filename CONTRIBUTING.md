# Contributing to FlowForge

We love your input! We want to make contributing to FlowForge as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## Development Process

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes.
5. Make sure your code lints.
6. Issue that pull request!

## Pull Request Process

1. Update the README.md with details of changes to the interface, if applicable.
2. Update the CHANGELOG.md with notes on your changes.
3. The PR will be merged once you have the sign-off of at least one maintainer.

## Any contributions you make will be under the MIT Software License

In short, when you submit code changes, your submissions are understood to be under the same [MIT License](LICENSE) that covers the project.

## Report bugs using GitHub's [issue tracker](https://github.com/yourusername/flowforge/issues)

We use GitHub issues to track public bugs. Report a bug by [opening a new issue](https://github.com/yourusername/flowforge/issues/new).

**Great Bug Reports** tend to have:

- A quick summary and/or background
- Steps to reproduce
  - Be specific!
  - Give sample code if you can
- What you expected would happen
- What actually happens
- Notes (possibly including why you think this might be happening, or stuff you tried that didn't work)

## Code Style

### JavaScript/TypeScript

- 2 spaces for indentation
- Use semicolons
- Use `const` and `let`, avoid `var`
- Use async/await over promises when possible
- Use meaningful variable names

### React

- Use functional components with hooks
- Use TypeScript for type safety
- Keep components small and focused
- Use proper prop types

### Git Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally after the first line

## Setting Up Development Environment

1. **Prerequisites**
   - Node.js 18+
   - MongoDB 4.4+
   - Git

2. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/flowforge.git
   cd flowforge
   ```

3. **Install dependencies**

   ```bash
   # Backend
   cd backend
   npm install

   # Frontend
   cd ../frontend
   npm install
   ```

4. **Set up environment**

   ```bash
   cp .env.example .env
   # Add your API keys
   ```

5. **Run tests**

   ```bash
   # Backend tests
   cd backend
   npm test

   # Frontend tests
   cd ../frontend
   npm test
   ```

## Code Review Process

All submissions require review. We use GitHub pull requests for this purpose. Consult [GitHub Help](https://help.github.com/articles/about-pull-requests/) for more information on using pull requests.

### Review Criteria

- Code quality and readability
- Test coverage
- Documentation updates
- Performance implications
- Security considerations

## Community

- Join our [Discord server](https://discord.gg/flowforge)
- Follow us on [Twitter](https://twitter.com/flowforge)
- Read our [blog](https://blog.flowforge.dev)

## License

By contributing, you agree that your contributions will be licensed under its MIT License.
