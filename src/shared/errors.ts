export class AppError extends Error {
	constructor(
		public readonly code: string,
		message: string,
		public readonly status: number,
	) {
		super(message);
		this.name = "AppError";
	}
}

export const notFound = (resource: string): AppError => new AppError("NOT_FOUND", `${resource} not found`, 404);

export const conflict = (message: string): AppError => new AppError("CONFLICT", message, 409);
