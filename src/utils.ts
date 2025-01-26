import { CryptoHasher } from 'bun'
import type { ETagHashAlgorithm, ETagHashFunction, ETagOptions } from './types'

export function parseMatchHeader(header?: string) {
	return header?.split(', ') ?? []
}

export function canBeHashed(response: any) {
	return (
		typeof response === 'string' ||
		response instanceof ArrayBuffer ||
		Array.isArray(response)
	)
}

function validateAlgorithm(algorithm: ETagHashAlgorithm) {
	if (algorithm === 'wyhash') {
		return true
	}

	if (!CryptoHasher.algorithms.includes(algorithm)) {
		throw new TypeError(`Algorithm ${algorithm} not supported.`)
	}
}

export function buildHashFn({
	algorithm,
	weak,
	hash
}: Required<ETagOptions>): ETagHashFunction {
	const prefix = weak ? 'W/"' : '"'

	if (hash) {
		return (response) => prefix + hash(response) + '"'
	}

	validateAlgorithm(algorithm)

	if (algorithm === 'wyhash') {
		return (response) => prefix + Bun.hash(response) + '"'
	}

	return (response) =>
		prefix + CryptoHasher.hash(algorithm, response, 'base64') + '"'
}
