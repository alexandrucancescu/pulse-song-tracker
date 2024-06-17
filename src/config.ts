import { readFile, stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import assert from 'node:assert'
import { dirname } from 'desm'

export type Endpoint = {
	url: string
	postKey: string
	headers: Record<string, string>
}

export type Config = {
	file: string
	endpoints: Endpoint[]
}

export async function getConfig(): Promise<Config> {
	const config: Partial<Config> = JSON.parse(
		await readFile(resolve(dirname(import.meta.url), '..', 'config.json'), {
			encoding: 'utf-8',
		})
	)

	assert(config.file, 'No file provided')

	const stats = await stat(config.file)

	assert(stats.isFile(), 'File is not a file')

	assert(config.endpoints, 'No endpoints provided')

	config.endpoints = config.endpoints.map((endpoint, i) => {
		assert(endpoint.url, `No url provided for endpoints[${i}]`)

		return {
			...endpoint,
			postKey: endpoint.postKey ?? 'title',
		}
	})

	return config as Config
}
