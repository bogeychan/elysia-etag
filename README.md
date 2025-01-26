# @bogeychan/elysia-etag

A plugin for [Elysia.js](https://elysiajs.com) for automatic [HTTP ETag](https://http.dev/etag) generation

## Installation

```bash
bun add @bogeychan/elysia-etag
```

## Usage

```ts
import { Elysia } from 'elysia'
import { etag } from '@bogeychan/elysia-etag'

const app = new Elysia()
	.use(etag())
	.get('/', () => 'Checkout the response headers!')
	.get('/custom-etag', (ctx) => {
		// This line disables automatic ETag generation
		// It will still return a 304 - Not Modified - status code if the ETag matches
		ctx.setETag('"myETag"')
		return 'Hello ETag!'
	})
	.listen(3000)

console.log(`Listening on ${app.server!.url}`)
```

### Use `serialize` to convert incompatible data to a hashable format

#### With JSON

```ts
new Elysia()
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
```

#### With [BunFile](https://bun.sh/docs/api/file-io)

```ts
new Elysia()
	.use(
		etag({
			serialize(response) {
				if (response instanceof Blob && 'lastModified' in response) {
					// based on last modified UNIX timestamp
					return (response as BunFile).lastModified.toString()

					// based on file content
					return (response as BunFile).bytes()
				}
			}
		})
	)
	.get('/', () => Bun.file('./file.txt'))
```

### Provide your own `hash` function

```ts
let myInsecureChangeCounter = 0

new Elysia()
	.use(
		etag({
			hash(response) {
				return (response as string) + myInsecureChangeCounter++
			}
		})
	)
	.get('/', () => 'Checkout the response headers!')
```

Checkout the [examples](./examples) folder on github for further use cases.

## Credits ❤️

This project was inspired by [@fastify/etag](https://www.npmjs.com/package/@fastify/etag)

## License

[MIT](LICENSE)
