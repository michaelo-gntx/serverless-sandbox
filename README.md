# serverless-sandbox

A sandbox application for testing various serverless technologies.

## Getting Started

This section provides some guides on how to stand up your development environment.

### Install

This project is written in Typescript and uses [Bun](https://bun.sh/) as the runtime. There are a few ways to install
Bun on your system. The easiest way is to install from the official Bun website. The recommended method is to use a tool
like [mise-en-place](https://mise.jdx.dev/) to manage your Bun installations. Other methods include using a package
manager like `homebrew`, `winget`, or a linux specific package manager.

With Bun installed, you can install the project dependencies by running the following command in the project root:

```bash
bun install
```

### Dev Containers

This project provides configurations to be able to stand up your development environment inside a Docker container.
This requires a running instance of docker and a tool that supports the development container
[specification](https://containers.dev/supporting). Some examples are the
[devcontainer-cli](https://github.com/devcontainers/cli), [DevPod](https://devpod.sh/) and VS Code via the
[Remote Development](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.vscode-remote-extensionpack)
extension pack.

## Development

### Building

To build the application, run the following command:

```bash
bun run build
```

### Deployment

This project uses the AWS CDK to manage infrastructure and deployment. To deploy the application, run the following
command:

```bash
bun run cdk deploy ApiStack
```

This will deploy the serverless API as well as all dependencies of the API stack.

## Testing

> [!NOTE]
> Unit tests are still a work in progress for this project.

To run the tests for the application, use the following command:

```bash
bun run test
```

## Resources

- [Bun](https://bun.sh/)
- [AWS CDK](https://docs.aws.amazon.com/cdk/api/v2/)
- [Hono](https://hono.dev/)
