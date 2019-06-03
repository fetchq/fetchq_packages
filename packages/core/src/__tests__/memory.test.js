import { FetchqClient } from '../lib/fetchq-client.class'
import { FetchQQueue } from '../lib/interfaces'
import { MemoryDriver } from '../lib/driver.memory'
import { addTime } from '../lib/dates'

const pause = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms))

const createClient = (driverSettings = {}, otherSettings = {}) =>
    new FetchqClient({
        driver: {
            type: MemoryDriver,
            ...driverSettings,
        },
        ...otherSettings,
    })

const queueStatus = (queue, isReady) =>
    new Promise(resolve => {
        let timer = setInterval(async () => {
            if (isReady(await queue.stats())) {
                clearInterval(timer)
                resolve()
            }
        }, 10)
    })

describe('FetchQ - in-memory driver', () => {
    let client = null

    beforeEach(() => {
        client = createClient({}, {
            name: 'generic-test',
            runMaintenance: false,
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
    
    test(`Clients should work independently from one another`, async () => {
        const c1 = createClient({}, { name: 'c1', runMaintenance: false })
        const c2 = createClient({}, { name: 'c2', runMaintenance: false })
        
        await Promise.all([
            c1.ref('q1').push([{ subject: 'd1' }]),
            c2.ref('q2').push([{ subject: 'd1' }]),
        ])
        
        await Promise.all([
            c1.destroy(),
            c2.destroy(),
        ])
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

    test(`A client should be able to handle multiple independent queues`, async () => {
        const q1 = client.ref('q1')
        const q2 = client.ref('q2')
        expect(q1).not.toBe(q2)
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
    })

    describe(`Stats`, () => {
        let q1 = null

        beforeEach(async () => {
            q1 = client.ref('q1')
            await q1.push([
                { subject: 'd1', nextIteration: new Date('2018-05-30') },
                { subject: 'd2', nextIteration: new Date('2018-05-29') },
                { subject: 'd3', nextIteration: new Date('3018-05-29') },
            ])    
        })

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

    describe(`Maintenance`, () => {
        let c1 = null
        let q1 = null

        beforeEach(async () => {
            c1 = createClient({}, {
                name: 'maintenance-test',
                runMaintenance: false,
            })

            q1 = c1.ref('q1')
            await q1.push([
                { subject: 'd1', nextIteration: addTime('now') },
                { subject: 'd2', nextIteration: addTime('now', '15ms') },
                { subject: 'd3', nextIteration: addTime('now', -1000) },
            ])    
        })

        afterEach(() => c1.destroy())

        test(`It should change a document status from PLANNED to PENDING`, async () => {
            expect(await q1.pick({ limit: 10 })).toHaveLength(2)

            await pause(15)
            const res = await q1.mntMakePending()

            expect(res).toEqual({ affected: 1 })
            expect(await q1.pick({ limit: 10 })).toHaveLength(1)
        })

        test(`It should reschedule orphans`, async () => {
            await q1.pick({ limit: 10, lock: '1ms' })
            await pause(1)
            expect(await q1.mntRescheduleOrphans()).toEqual({ affected: 2 })
        })

        test(`It should kill documents based on tolerance`, async () => {
            await q1.applySettings({ tolerance: 0 })
            await q1.pick({ limit: 1, lock: '1ms' })
            await pause(10)
            expect(await q1.mntRescheduleOrphans()).toEqual({ affected: 0 })
            expect(await q1.mntKillOrphans()).toEqual({ affected: 1 })
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
            q1.registerWorker(
                (doc, { reschedule }) => reschedule('1y'),
                { delay: 1, batch: 10 }
            )

            await queueStatus(q1, ({ pnd, act }) => pnd + act === 0)
        })
        
        test(`A worker should complete an entire queue`, async () => {
            q1.registerWorker(
                (doc, { complete }) => complete(),
                { delay: 1, batch: 10 }
            )

            await queueStatus(q1, ({ cpl }) => cpl === 2)
        })

        test(`A worker should kill an entire queue`, async () => {
            q1.registerWorker(
                (doc, { kill }) => kill(),
                { delay: 1, batch: 10 }
            )

            await queueStatus(q1, ({ kll }) => kll === 2)
        })
        
        test(`A worker should reject an entire queue`, async () => {
            q1.registerWorker(
                (doc, { reject }) => reject(),
                { delay: 1, batch: 10 }
            )

            await queueStatus(q1, ({ err }) => err === 2)
        })

        test(`A worker should promply pick a recently added document`, async () => {
            const q2 = await client.ref('q2').isReady()

            q2.registerWorker(
                (doc, { complete }) => complete(),
                { delay: 10000, sleep: 10000 }
            )

            setTimeout(async () => q2.push([{ subject: 'd1' }]))

            await queueStatus(q2, ({ cpl }) => cpl === 1)
        })

        test(`A document that becomes pending should wake up a sleeping worker`, async () => {
            const q2 = await client.ref('q2').isReady()
            await q2.push([{ subject: 'd1', nextIteration: addTime('now', '5ms') }])

            q2.registerWorker(
                (doc, { complete }) => complete(),
                { delay: 10000, sleep: 10000 }
            )

            await pause(10)
            await q2.mntMakePending()
            
            await queueStatus(q2, ({ cpl }) => cpl === 1)
        })
    })

    describe(`Client management queue`, () => {
        test(`It should run management tasks`, async () => {

            const client = createClient({
                mntWorkerDelay: 0,
                mntWorkerSleep: 25,
            }, { name: 't2' })

            const q1 = client.ref('q1')
            await q1.applySettings({
                mntMakePendingDelay: '5ms',
            })

            await q1.push([{ subject: 'foo', nextIteration: '5ms' }])

            expect((await q1.pick()).length).toBe(0)
            await pause(500)

            // await q1.mntMakePending()
            expect((await q1.pick()).length).toBe(1)

            await client.destroy()
        })
    })
})
