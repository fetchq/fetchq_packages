import { FetchqClient } from '../lib/fetchq-client.class'
import { FetchQDriver, FetchQQueue } from '../lib/interfaces'
import { STATUS_INITIALIZING } from '../lib/interfaces'
import { addTime, parse as parseDate } from '../lib/dates'

const pause = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms))

const docStatus = date => date > new Date() ? FetchQQueue.status.PLANNED : FetchQQueue.status.PENDING

const docDefaults = doc => {
    const nextIteration = parseDate(doc.nextIteration)

    return {
        subject: doc.subject || 'jdhoe', // maybe uuid?
        payload: doc.payload || {},
        lastIteration: doc.lastIteration || null,
        status: docStatus(nextIteration),
        attempts: 0,
        iterations: 0,
        nextIteration,
    }
}

const flatDocs = docs => {
    const list = Object.keys(docs).map(subject => docs[subject])
    list.sort((a, b) => a.nextIteration - b.nextIteration)
    return list
}

class MemoryQueue extends FetchQQueue {
    async init () {
        this.status = STATUS_INITIALIZING
        await pause()

        this.docs = {}
        this.list = []

        return super.init()
    }

    async push (docs) {
        const res = await super.push()

        docs.forEach(doc => {
            const { subject } = doc

            if (this.docs[subject]) {
                res.skipped++
                return
            }

            this.docs[subject] = docDefaults(doc)
            res.created++
        })

        this.list = flatDocs(this.docs)
        return res
    }

    async get (subject) {
        await super.get()

        if (this.docs[subject]) {
            return this.docs[subject]
        }

        throw new Error('document not found')
    }

    async pick ({ limit = 1, lock = '5m' } = {}) {
        await super.pick()

        const docs = this.list.slice(0, limit)
            .map(doc => {
                doc.nextIteration = addTime(Date.now(), lock)
                doc.status = FetchQQueue.status.ACTIVE
                doc.attempts += 1
                return doc
            })

        this.list = flatDocs(this.docs)
        return docs
    }

    async reschedule (doc, nextIterationPlan) {
        await super.reschedule()

        const { subject } = doc
        const nextIteration = parseDate(nextIterationPlan)

        this.docs[subject].nextIteration = nextIteration
        this.docs[subject].lastIteration = parseDate()
        this.docs[subject].status = docStatus(nextIteration)
        this.docs[subject].attempts = 0
        this.docs[subject].iterations += 1

        return this
    }

    async complete (doc) {
        await super.complete()

        const { subject } = doc

        this.docs[subject].lastIteration = parseDate()
        this.docs[subject].status = FetchQQueue.status.COMPLETED
        this.docs[subject].attempts = 0
        this.docs[subject].iterations += 1

        return this
    }
    
    async kill (doc) {
        await super.kill()

        const { subject } = doc

        this.docs[subject].lastIteration = parseDate()
        this.docs[subject].status = FetchQQueue.status.KILLED
        this.docs[subject].attempts = 0
        this.docs[subject].iterations += 1

        return this
    }
}

class MemoryDriver extends  FetchQDriver {
    constructor (config, client) {
        super(config, client)
        this.queueConstructor = MemoryQueue
    }

    async init () {
        this.status = STATUS_INITIALIZING
        await pause()
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

    test('A queue should be able to ingest a document', async () => {
        const res = await client.ref('q1').push([
            { subject: 'd1' },
            { subject: 'd2' },
            { subject: 'd2' },
        ])
        expect(client.status).toBe(2)
        expect(res).toEqual({ created: 2, skipped: 1 })
    })

    describe('Documents Handling', () => {
        let q1 = null

        beforeEach(async () => {
            q1 = client.ref('q1')
            await q1.push([
                { subject: 'd1', nextIteration: new Date('2018-05-30') },
                { subject: 'd2', nextIteration: new Date('2018-05-29') },
                { subject: 'd3', nextIteration: new Date('3018-05-29') },
            ])    
        })

        test('A queue should be able to return the oldest document that need to be processed', async () => {
            const docs = await q1.pick()
            expect(docs[0].subject).toBe('d2')
        })
    
        test('It should be possible to limit the amount of picked documents', async () => {
            const docs = await q1.pick({ limit: 1 })
            expect(docs.length).toBe(1)
        })
    
        test('Picking documents should lock them for a configurable amount of time', async () => {
            const docs = await q1.pick({ limit: 1, lock: '1s' })
            expect(docs[0].nextIteration - new Date()).toBe(1000)
            expect(docs[0].attempts).toBe(1)

            // next pick should be the other document
            const docs1 = await q1.pick({ limit: 1 })
            expect(docs1[0].subject).toBe('d1')
        })

        describe('Resolving Documents', () => {
            let docs = null

            beforeEach(async () => {
                docs = await q1.pick({ limit: 1 })
            })

            test('A picked document should have an active status', () => {
                expect(docs[0].status).toBe(FetchQQueue.status.ACTIVE)
            })

            test('A document should be rescheduled in the future', async () => {
                await q1.reschedule(docs[0], '1y')
                const doc = await q1.get(docs[0].subject)
                expect(doc.status).toBe(FetchQQueue.status.PLANNED)
                expect(doc.attempts).toBe(0)
                expect(doc.iterations).toBe(1)
            })
            
            test('A document should be rescheduled in the past', async () => {
                await q1.reschedule(docs[0], '1000-01-01')
                const doc = await q1.get(docs[0].subject)
                expect(doc.status).toBe(FetchQQueue.status.PENDING)
                expect(doc.attempts).toBe(0)
                expect(doc.iterations).toBe(1)
            })

            test(`A document can be marked as "completed"`, async () => {
                await q1.complete(docs[0])
                const doc = await q1.get(docs[0].subject)
                expect(doc.status).toBe(FetchQQueue.status.COMPLETED)
                expect(doc.attempts).toBe(0)
                expect(doc.iterations).toBe(1)
            })
            
            test(`A document can be marked as "killed"`, async () => {
                await q1.kill(docs[0])
                const doc = await q1.get(docs[0].subject)
                expect(doc.status).toBe(FetchQQueue.status.KILLED)
                expect(doc.attempts).toBe(0)
                expect(doc.iterations).toBe(1)
            })
        })

        // test(`"active" documents should not be picked`)
        // test(`"completed" documents should not be picked ever again`)
        // test(`"killed" documents should not be picked ever again`)
    })
})
