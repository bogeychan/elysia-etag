import Elysia from 'elysia'
import { etag } from '../src'

const app = new Elysia()
	.use(etag())
	.get('/', () => 'Checkout the response headers!')
	.listen(8080)

console.log(`Listening on ${app.server!.url}`)
