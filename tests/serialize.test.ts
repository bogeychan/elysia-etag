import { Elysia } from 'elysia'
import path from 'node:path'
import { etag } from '../src'
import type { ETagOptions } from '../src/types'

import { CryptoHasher, type BunFile } from 'bun'
import { describe, expect, it } from 'bun:test'
import { req } from './utils'

describe('Etag - serialize', () => {
	class Input {
		constructor(
			public label: string,
			public value: any,
			public serialize: ETagOptions['serialize']
		) {}

		toJSON() {
			return this.label
		}
	}

	const JSONSerializer: ETagOptions['serialize'] = function (response) {
		if (typeof response === 'object') {
			return JSON.stringify(response)
		}
	}

	it.each([
		new Input('JSON - Object', { my: 'json' }, JSONSerializer),
		new Input('JSON - Array', [1, 2, 3, 4, 5], JSONSerializer),
		new Input(
			'BunFile',
			Bun.file(path.join(__dirname, '..', 'package.json')),
			function (response) {
				if (response instanceof Blob && 'lastModified' in response) {
					return (response as BunFile).lastModified.toString()
				}
			}
		)
	])('%j', async ({ value, serialize }) => {
		const expected = (await serialize!(value))!
		expect(expected).toBeDefined()

		const app = new Elysia().use(etag({ serialize })).get('/', () => value)

		const res = await app.handle(req('/'))

		expect(res.headers.get('etag')).toBe(
			'"' + CryptoHasher.hash('sha1', expected, 'base64') + '"'
		)
	})
})
