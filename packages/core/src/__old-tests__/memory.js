const fetchq = require('../lib/index')
const { FetchQDriver, FetchQQueue } = require('../lib/interfaces')

class MemoryQueue extends FetchQQueue {
    constructor (name) {
        super(name)
        this.init()
    }

    // Simulates an asynchronous setup of the queue where we should
    // check if the table exists in Postgres, else create it.
    async init () {
        console.log('INIT MEM')
        return new Promise(resolve => {
            setTimeout(() => {
                this.keys = {}
                this.docs = []
                this.status = 2
                this.emit('ready')
            })
        })
    }

    async push (docs) {
        console.log('PUSH', this.driver.client.status)
        await this.isReady()

        let skipped = 0
        let created = 0
        docs.forEach(doc => {
            if (this.keys[doc.subject]) {
                skipped++
                return
            }

            this.keys[doc.subject] = true
            this.docs.push(doc)
            created++
        })

        return { skipped, created }
    }

    async count () {
        return 0
    }
}

class MemoryDriver extends FetchQDriver {
    constructor (config, client) {
        super(config, client)
        this.queues = {}
    }

    // Simulate an asynchronous connection to the database
    async connect () {
        return new Promise(resolve => setTimeout(resolve, 10))
    }

    createQueueRef (name) {
        return new MemoryQueue(name)
    }
}

describe.skip('FetchQ Memory Driver', () => {
    let client = null

    beforeEach(async () => {
        client = fetchq.createClient({ driver: { type: MemoryDriver }})
    })

    afterEach(async () => {
        await fetchq.destroyAll()
    })

    it(`should get a new reference`, () => {
        expect.assertions(1)
        const ref = client.ref('q1')
        expect(ref).toBeInstanceOf(FetchQQueue)
    })

    it(`should be able to queue documents`, async () => {
        expect.assertions(2)
        // await client.connect()
        const res = await client.ref('q1').push([
            { subject: 'd1' },
            { subject: 'd2' },
            { subject: 'd2' },
        ])

        expect(res.skipped).toBe(1)
        expect(res.created).toBe(2)
    })
})
