import { FetchQInit } from './interfaces.fetchq-init'
import { FetchQWorker } from './worker.class'

// This queue should be much simpler and ger documents from the older move on
// there should be only 3-5 documents per queue so it doesn't need much optimization nor stats
export class FetchQMaintenance extends FetchQInit {
    constructor (client, config = {}) {
        super()
        this.name = 'mnt'
        this.client = client

        this.settings = {}

        this.workers = []
        this.workerSettings = {}
    }

    workerHandler = async  (doc, { reschedule }) => {
        const [ taskName, queueName ] = doc.subject.split('::')
        const queue = this.client.ref(queueName)
        console.log('maintenance -', taskName, queueName, doc.payload.delay)

        switch (taskName) {
            case 'pnd':
                await queue.mntMakePending()
                break
            case 'kll':
                await queue.mntKillOrphans()
                break
            case 'orp':
                await queue.mntRescheduleOrphans()
                break
        }

        reschedule(doc.payload.delay || '3s')
    }

    async init () {
        if (this.client.runMaintenance) {
            const { mntWorkerDelay: delay, mntWorkerSleep: sleep } = this.client.config
            this.registerWorker(this.workerHandler, {
                ...this.workerSettings,
                ...(delay ? { delay } : {}),
                ...(sleep ? { sleep } : {}),
            })
        }

        return super.init()
    }

    async isReady () {
        await this.client.isReady()
        return super.isReady()
    }

    async push (docs) {
        await this.isReady()
        return { created: 0, skipped: 0 }
    }

    async pick () {
        await this.isReady()
        return []
    }

    async reschedule (doc, nextIteration) {
        await this.isReady()
        return this
    }
    
    async reject (doc, nextIteration) {
        await this.isReady()
        return this
    }
    
    async complete (doc) {
        await this.isReady()
        return this
    }
    
    async kill (doc) {
        await this.isReady()
        return this
    }
    
    async drop (doc) {
        await this.isReady()
        return this
    }

    registerWorker (handler, settings) {
        const worker = new FetchQWorker(this, handler, settings)
        worker.start()
        worker.unregister = async () => {
            await worker.destroy()
            this.workers.splice(this.workers.indexOf(worker), 1)
        }

        this.workers.push(worker)
        return worker
    }

    async destroy () {
        await Promise.all(this.workers.map(worker => worker.destroy()))
        return super.destroy()
    }
}

