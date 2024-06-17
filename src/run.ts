import { readFile } from 'node:fs/promises'
import { watch } from 'node:fs'
import ky, { HTTPError } from 'ky'
import { getConfig } from './config.js'
import iconv from 'iconv-lite'
import chardet from 'chardet'

const { file, endpoints } = await getConfig()

console.log(`Listening for file changes in ${file}...`)

let currentContent: string = ''

watch(file, { persistent: true }, async () => {
	const contentBuffer = await readFile(file)

	const detectedEncoding = chardet.detect(contentBuffer)

	let content: string

	if (detectedEncoding && iconv.encodingExists(detectedEncoding)) {
		content = iconv.decode(contentBuffer, detectedEncoding)
	} else {
		content = iconv.decode(contentBuffer, 'utf-8')
	}

	if (content === currentContent || content.length < 1) return

	currentContent = content

	console.log(`File (Encoding: ${detectedEncoding}) changed to: ${content}`)

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
		.catch(error => {
			if (error instanceof HTTPError) {
				error.response
					.json()
					.then(json => {
						console.error(`Request to ${endpoint.url} failed:`, json)
					})
					.catch(() =>
						console.error(`Request to ${endpoint.url} failed:`, error.message)
					)
			} else {
				console.error(error.message)
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
