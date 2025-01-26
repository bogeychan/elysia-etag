export const req = (
	path: string,
	headers?: Record<string, string>,
	method?: string,
	body?: string
) => new Request(`http://localhost${path}`, { headers, method, body })
