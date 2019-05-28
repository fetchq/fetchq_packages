/**
 * This module handles a global API to a FetchQ client.
 * (this is little more than a singleton library)
 */

import { Fetchq } from './fetchq.class'
import { FetchQDuplicateClientError, FetchQClientNotFoundError } from './errors'

// Utilities that allows other modules to expand the Core
export { registerDriver } from './drivers'
export * from './interfaces'

const DEFAULT_CLIENT_NAME = 'default'
const clients = {}

let defaults = {
    driver: {
        type: 'memory',
    }
}

export const setDefaults = (values = {}) => {
    defaults = values
}

export const createClient = (config = {}) => {
    const name = config.name || DEFAULT_CLIENT_NAME

    if (clients[name]) {
        throw new FetchQDuplicateClientError(`client "${name}" already defined`)
    }

    const client = new Fetchq({ ...config, name })
    return clients[name] = client
}

export const getClient = (name = DEFAULT_CLIENT_NAME) => {
    if (!clients[name]) {
        throw new FetchQClientNotFoundError(`client "${name}" not found`)
    }
    return clients[name]
}

// Retrive a client for active usage
export const useClient = async (name = DEFAULT_CLIENT_NAME) => {
    const client = clients[name] || createClient(defaults)
    if (!client.isReady()) {
        await client.connect()
    }
    return client
}

// Global access utilities
// (fallback on the default client name)
export const connect = (config) => createClient(config).connect()
export const getStatus = (name) => getClient(name).getStatus()

export const ref = async (queue) =>
    (await useClient()).ref(queue)

export const push = async (queue, docs) =>
    (await ref(queue)).push(docs)

// Mostly used for testing
// disconnect and removes any existing client
export const destroyAll = async () => {
    await Promise.all(Object.keys(clients).map(key => clients[key].destroy()))
    Object.keys(clients).forEach(key => delete clients[key])
}

export default {
    setDefaults,
    createClient,
    getClient,
    getStatus,
    connect,
    destroyAll,
    ref,
    push,
}

