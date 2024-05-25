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
	.listen(8080)

console.log(`Listening on ${app.server!.url}`)
```

Checkout the [examples](./examples) folder on github for further use cases.

## Credits ❤️

This project was inspired by [@fastify/etag](https://www.npmjs.com/package/@fastify/etag)

## Author

[bogeychan](https://github.com/bogeychan)

## License

[MIT](LICENSE)
