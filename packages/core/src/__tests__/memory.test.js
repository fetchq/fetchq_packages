import { FetchqClient } from '../lib/fetchq-client.class'
import { FetchQQueue } from '../lib/interfaces'
import { MemoryDriver } from '../lib/driver.memory'

const pause = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms))

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
            expect(docs[0].nextIteration - new Date()).toBeLessThanOrEqual(1000)
            expect(docs[0].attempts).toBe(1)

            const docs1 = await q1.pick({ limit: 1 })
            expect(docs1[0].subject).toBe('d1')
        })

        test(`"active" documents should not be picked`, async () => {
            await q1.pick({ limit: 10 })
            const docs = await q1.pick({ limit: 10 })
            expect(docs.length).toBe(0)
        })

        test(`"completed" documents should not be picked ever again`, async () => {
            const docs = await q1.pick({ limit: 10 })
            await Promise.all(docs.map(doc => q1.complete(doc)))

            const docs1 = await q1.pick({ limit: 10 })
            expect(docs1.length).toBe(0)
        })
        
        test(`"killed" documents should not be picked ever again`, async () => {
            const docs = await q1.pick({ limit: 10 })
            await Promise.all(docs.map(doc => q1.kill(doc)))

            const docs1 = await q1.pick({ limit: 10 })
            expect(docs1.length).toBe(0)
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
            
            test(`A document can be dropped from the queue`, async () => {
                await q1.drop(docs[0])
                const doc = await q1.get(docs[0].subject)
                expect(doc).toBe(null)

                const stats = await q1.stats()
                expect(stats.drp).toBe(1)
            })
        })

        describe('Rejecting Documents', () => {
            let docs = null

            beforeEach(async () => {
                docs = await q1.pick({ limit: 1 })
            })

            test('A picked document should be rejected', async () => {
                await q1.reject(docs[0], new Error('foo'))
                const doc = await q1.get(docs[0].subject)
                expect(doc.status).toBe(FetchQQueue.status.PLANNED)
                expect(doc.attempts).toBe(1)
                expect(doc.iterations).toBe(1)
            })

            test('A picked document should be rejected with a nextIteration date', async () => {
                const nextIteration = new Date(Date.now() - 1000)
                await q1.reject(docs[0], new Error('foo'), nextIteration)
                const doc = await q1.get(docs[0].subject)
                expect(doc.status).toBe(FetchQQueue.status.PENDING)
                expect(doc.attempts).toBe(1)
                expect(doc.iterations).toBe(1)
                expect(doc.nextIteration).toEqual(nextIteration)
            })

            test('Attempts should grow if the documents fails multiple times', async () => {
                const nextIteration = new Date('1000-01-01')
                await q1.reject(docs[0], new Error('foo'), nextIteration)

                const docs1 = await q1.pick()
                await q1.reject(docs1[0], new Error('foo'), nextIteration)
                
                const doc = await q1.get(docs1[0].subject)
                expect(doc.attempts).toBe(2)
                expect(doc.iterations).toBe(2)
            })

            test('Too many rejections kill the document', async () => {
                await q1.applySettings({ tolerance: 0 })
                await q1.reject(docs[0], new Error('foo'))
                const doc = await q1.get(docs[0].subject)
                expect(doc.status).toBe(FetchQQueue.status.KILLED)
            })
        })

        describe(`Stats`, () => {
            test(`It should provide basic queue stats`, async () => {
                const stats = await q1.stats()
                expect(stats).toEqual({
                    // time based
                    cnt: 3,
                    pkd: 0,
                    drp: 0,
                    err: 0,
                    // status count
                    pln: 1,
                    pnd: 2,
                    act: 0,
                    cpl: 0,
                    kll: 0,
                })
            })
        })
    })

    describe(`Workers`, () => {
        let q1 = null

        beforeEach(async () => {
            q1 = client.ref('q1')
            await q1.push([
                { subject: 'd1', nextIteration: new Date('2018-05-30') },
                { subject: 'd2', nextIteration: new Date('2018-05-29') },
                { subject: 'd3', nextIteration: new Date('3018-05-29') },
            ])    
        })

        test(`A worker should reschedule an entire queue`, async () => {
            const worker = q1.registerWorker(
                (doc, { reschedule }) => reschedule('1y'),
                { delay: 1, batch: 10 }
            )

            try {
                await new Promise(resolve =>
                    setInterval(async () => {
                        const stats = await q1.stats()
                        if (stats.pnd === 0 && stats.act === 0) resolve()
                    }, 10))
            } catch (err) {}

            await worker.unregister()
        })
        
        test(`A worker should complete an entire queue`, async () => {
            const worker = q1.registerWorker(
                (doc, { complete }) => complete(),
                { delay: 1, batch: 10 }
            )

            try {
                await new Promise(resolve =>
                    setInterval(async () => {
                        const stats = await q1.stats()
                        if (stats.cpl === 2) resolve()
                    }, 10))
            } catch (err) {}

            await worker.unregister()
        })

        test(`A worker should kill an entire queue`, async () => {
            const worker = q1.registerWorker(
                (doc, { kill }) => kill(),
                { delay: 1, batch: 10 }
            )

            try {
                await new Promise(resolve =>
                    setInterval(async () => {
                        const stats = await q1.stats()
                        if (stats.kll === 2) resolve()
                    }, 10))
            } catch (err) {}

            await worker.unregister()
        })
        
        test(`A worker should reject an entire queue`, async () => {
            const worker = q1.registerWorker(
                (doc, { reject }) => reject(),
                { delay: 1, batch: 10 }
            )

            try {
                await new Promise(resolve =>
                    setInterval(async () => {
                        const stats = await q1.stats()
                        if (stats.err === 2) resolve()
                    }, 10))
            } catch (err) {}

            await worker.unregister()
        })
    })
})
