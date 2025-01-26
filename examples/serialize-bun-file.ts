import path from 'node:path'
import { Elysia } from 'elysia'
import type { BunFile } from 'bun'

import { etag } from '../src'

const app = new Elysia()
	.use(
		etag({
			serialize(response) {
				if (response instanceof Blob && 'lastModified' in response) {
					// return (response as BunFile).lastModified.toString()
					return (response as BunFile).bytes()
				}
			}
		})
	)
	.get('/', () => Bun.file(path.join(__dirname, '..', 'package.json')))
	.listen(3000)

console.log(`Listening on ${app.server!.url}`)
