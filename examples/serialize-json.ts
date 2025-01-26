import Elysia from 'elysia'
import { etag } from '../src'

const app = new Elysia()
	.use(
		etag({
			serialize(response) {
				if (typeof response === 'object') {
					return JSON.stringify(response)
				}
			}
		})
	)
	.get('/', () => ({ my: 'json' }))
	.listen(3000)

console.log(`Listening on ${app.server!.url}`)
