import { readFile } from 'node:fs/promises'
import { watch } from 'node:fs'
import ky, { HTTPError } from 'ky'
import { getConfig } from './config.js'

const { file, endpoints } = await getConfig()

let lastSong: string = ''

watch(file, { persistent: true }, async event => {
	const content = await readFile(file, { encoding: 'utf-8' })

	if (content === lastSong || content.length < 1) return

	lastSong = content

	console.log(`File changed to: ${content}`)

	await callAllEndpoints(content)
})

async function callEndpoint(endpoint: any, content: string) {
	return ky
		.post(endpoint.url, {
			json: { [endpoint.postKey]: content },
			headers: endpoint.headers,
		})
		.json()
		.then(() => true)
		.catch(result => {
			if (result instanceof HTTPError) {
				//@ts-ignore
				result.response.json().then(json => {
					console.error(`Request to ${endpoint.url} failed:`, json)
				})
			} else {
				console.error(result.message)
			}
			return false
		})
}

async function callAllEndpoints(fileContent: string) {
	return Promise.all(
		endpoints.map(endpoint => callEndpoint(endpoint, fileContent))
	).then(results => {
		const succeeded = results.reduce((acc, current) => acc + (current ? 1 : 0), 0)

		console.log(`${succeeded}/${results.length} endpoints called successfully`)
	})
}
