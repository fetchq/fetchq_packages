import { FetchQInit } from './interfaces.fetchq-init'
import { FetchQWorker } from './worker.class'

export class FetchQQueue extends FetchQInit {
    constructor (client, name) {
        super()
        this.client = client
        this.name = name

        this.settings = {}
        this.workers = []
    }

    async init () {
        await this.client.driver.maintenance.push([
            // transition planned>pending
            { 
                subject: `pnd::${this.name}`,
                payload: { delay: this.settings.mntMakePendingDelay || '3s' },
            },
            // collect dead documents
            {
                subject: `kll::${this.name}`,
                payload: { delay: this.settings.mntKillOrphanDelay || '3s' },
            },
            // reschedule orphans documents
            {
                subject: `orp::${this.name}`,
                payload: { delay: this.settings.mntRescheduleOrphanDelay || '3s' },
            },
        ])

        return super.init()
    }

    async isReady () {
        await this.client.isReady()
        return super.isReady()
    }

    // this has the responsibility of coordinating the change in settings
    async applySettings (settings) {
        await this.client.isReady()
        // client should notify that the queue is paused for all the
        // other connected clients???
        // how do we handle that in postgres???
        await Promise.all(this.workers.map(worker => worker.pause()))
        await this.flowSettings(settings)
        await Promise.all(this.workers.map(worker => worker.resume()))
    }

    // this has the responsibility of actually changin the settings
    // in Postgres it will probably rewrite the server functions for the queue
    // and update the settings table
    async flowSettings (settings = {}) {
        this.settings = {
            ...this.settings,
            ...settings,
        }
    }

    async push (docs) {
        await this.isReady()
        return { created: 0, skipped: 0 }
    }

    async get (subject) {
        await this.isReady()
        return {} // document
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

    async stats () {
        await this.isReady()
        return {
            cnt: 0,
            pln: 0,
            pnd: 0,
            act: 0,
            cpl: 0,
            kll: 0,
            err: 0,
        }
    }

    async mntMakePending (settings = {}) {
        await this.isReady()
        return { affected: 0 }
    }

    async mntRescheduleOrphans (settings = {}) {
        await this.isReady()
        return { affected: 0 }
    }
    async mntKillOrphans (settings = {}) {
        await this.isReady()
        return { affected: 0 }
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

FetchQQueue.status = {
    PLANNED: 0,
    PENDING: 1,
    ACTIVE: 2,
    COMPLETED: 3,
    KILLED: -1,
}
