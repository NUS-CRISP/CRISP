export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class BadRequestError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, BadRequestError.prototype);
  }
}

export class MissingAuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, MissingAuthorizationError.prototype);
  }
}

export class GitHubError extends Error {
  constructor(name: string, message: string) {
    super(message);
    this.name = name;
    Object.setPrototypeOf(this, GitHubError.prototype);
  }
}
