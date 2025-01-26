import { Elysia } from 'elysia'
import { etag } from '../src'

import { CryptoHasher } from 'bun'
import { describe, expect, it } from 'bun:test'
import { req } from './utils'

describe('Etag - response', () => {
	class Input {
		constructor(public value: any) {}

		toJSON() {
			return this.value.constructor.name
		}
	}

	it.each([
		new Input('Hello World!'),
		new Input(new ArrayBuffer(42)),
		new Input(new Uint8Array(42)),
		new Input(new Uint16Array(42)),
		new Input(new Uint32Array(42)),
		new Input(new Int8Array(42)),
		new Input(new Int16Array(42)),
		new Input(new Int32Array(42)),
		new Input(new SharedArrayBuffer(42))
	])('%j', async ({ value }) => {
		const app = new Elysia().use(etag()).get('/', () => value)

		const res = await app.handle(req('/'))

		expect(res.headers.get('etag')).toBe(
			'"' + CryptoHasher.hash('sha1', value, 'base64') + '"'
		)
	})
})
