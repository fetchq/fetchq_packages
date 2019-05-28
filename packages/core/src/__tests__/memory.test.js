import { FetchqClient } from '../lib/fetchq-client.class'
import { FetchQDriver, FetchQQueue } from '../lib/interfaces'
import { STATUS_INITIALIZING } from '../lib/interfaces'

const pause = ms => new Promise(resolve => setTimeout(resolve, ms))

class MemoryQueue extends FetchQQueue {
    async init () {
        console.log('Initialize queue', this.name)
        this.status = STATUS_INITIALIZING
        await pause(10)
        return super.init()
    }
}

class MemoryDriver extends  FetchQDriver {
    constructor (config, client) {
        super(config, client)
        this.queueConstructor = MemoryQueue
    }

    async init () {
        console.log('Initialize memory driver')
        this.status = STATUS_INITIALIZING
        await pause(10)
        return super.init()
    }
}

describe('FetchQ - in-memory driver', () => {
    let client = null

    beforeEach(() => {
        client = new FetchqClient({
            driver: {
                type: MemoryDriver,
            },
        })
    })

    afterEach(async () => {
        await client.destroy()
    })

    test('It should initialize the client when asked for readyness', async () => {
        await client.isReady()
        expect(client.status).toBe(2)
    })

    test('It should refer to a queue without any kind of initialization', async () => {
        const q = client.ref('q1')
        expect(q).toBeInstanceOf(FetchQQueue)
    })

    test('A queue should kick the client initialization chain', async () => {
        await client.ref('q1').isReady()
        expect(client.status).toBe(2)
    })
})
