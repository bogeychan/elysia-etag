import { Elysia } from 'elysia'
import { etag } from '../src'

import { CryptoHasher } from 'bun'
import { describe, expect, it } from 'bun:test'
import { req } from './utils'

describe('ETag - algorithms', () => {
	it('should throw an Error if used invalid algorithm', async () => {
		// @ts-expect-error algorithm
		expect(() => etag({ algorithm: 'invalid' })).toThrow()
	})

	it('strong md5', async () => {
		const app = new Elysia()
			.use(etag({ algorithm: 'md5' }))
			.get('/', () => 'Hello World!')

		const res = await app.handle(req('/'))

		expect(res.headers.get('etag')).toBe(
			'"' + CryptoHasher.hash('md5', 'Hello World!', 'base64') + '"'
		)
	})

	it('strong sha1', async () => {
		const app = new Elysia()
			.use(etag({ algorithm: 'sha1' }))
			.get('/', () => 'Hello World!')

		const res = await app.handle(req('/'))

		expect(res.headers.get('etag')).toBe(
			'"' + CryptoHasher.hash('sha1', 'Hello World!', 'base64') + '"'
		)
	})

	it('weak wyhash', async () => {
		const app = new Elysia()
			.use(etag({ algorithm: 'wyhash', weak: true }))
			.get('/', () => 'Hello World!')

		const res = await app.handle(req('/'))

		expect(res.headers.get('etag')).toBe('W/"' + Bun.hash('Hello World!') + '"')
	})

	it('default - strong sha1', async () => {
		const app = new Elysia().use(etag()).get('/', () => 'Hello World!')

		const res = await app.handle(req('/'))

		expect(res.headers.get('etag')).toBe(
			'"' + CryptoHasher.hash('sha1', 'Hello World!', 'base64') + '"'
		)
	})
})
