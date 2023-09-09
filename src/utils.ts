import type { ETagHashAlgorithm, ETagHashFunction, ETagOptions } from './types';

import crypto from 'node:crypto';

export function parseMatchHeader(header: string | null) {
  return header?.split(', ') ?? [];
}

export function canBeHashed(response: any) {
  return (
    typeof response === 'string' ||
    response instanceof ArrayBuffer ||
    Array.isArray(response)
  );
}

function validateAlgorithm(algorithm: ETagHashAlgorithm) {
  if (algorithm === 'wyhash') {
    return true;
  }

  if (!Bun.CryptoHasher.algorithms.includes(algorithm)) {
    throw new TypeError(`Algorithm ${algorithm} not supported.`);
  }
}

export function buildHashFn({
  algorithm,
  weak,
  hash
}: Required<ETagOptions>): ETagHashFunction {
  const prefix = weak ? 'W/"' : '"';

  // @ts-ignore hash
  if (hash) {
    return (response) => prefix + hash(response) + '"';
  }

  validateAlgorithm(algorithm);

  if (algorithm === 'wyhash') {
    return (response) => prefix + Bun.hash(response) + '"';
  }

  return (response) =>
    // prefix + Bun.CryptoHasher.hash(algorithm, response, 'base64') + '"';
    prefix +
    new Bun.CryptoHasher(algorithm).update(response).digest('base64') +
    '"';
}
