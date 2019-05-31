import EventEmitter from 'events'
import { FetchQWorker } from './worker.class'

export const STATUS_DEFAULT = 0
export const STATUS_INITIALIZING = 1
export const STATUS_INITIALIZED = 2

export const EVENT_READY = 'ready'

export class FetchQInit extends EventEmitter {
    constructor () {
        super()
        this.status = STATUS_DEFAULT
    }

    async init () {
        this.status = STATUS_INITIALIZED
        this.emit(EVENT_READY)
        return this
    }

    // removes all the event listeners that have been associated
    async destroy () {
        this.eventNames().forEach(name => this.removeAllListeners(name))
        this.status = STATUS_DEFAULT
    }

    async isReady () {
        return new Promise(resolve => {
            if (this.status === STATUS_INITIALIZED) {
                resolve(this)
                return
            }
            
            // wait for initialization to complete
            this.once(EVENT_READY, () => resolve(this))

            // auto initialize
            if (this.status === STATUS_DEFAULT) {
                this.init()
            }
        })
    }
}

export class FetchQQueue extends FetchQInit {
    constructor (name, client) {
        super()
        this.name = name
        this.client = client

        this.settings = {}
        this.workers = []
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
    }
}

FetchQQueue.status = {
    PLANNED: 0,
    PENDING: 1,
    ACTIVE: 2,
    COMPLETED: 3,
    KILLED: -1,
}

export class FetchQDriver extends FetchQInit {
    constructor (config, client) {
        super()
        this.config = config
        this.client = client
        this.queues = {}
        this.queueConstructor = FetchQQueue
    }

    ref = queueName => {
        if (!this.queues[queueName]) {
            this.queues[queueName] = new this.queueConstructor(queueName, this.client)
            return this.queues[queueName]
        }
        return this.queues[queueName]
    }

    async destroy () {
        await Promise.all(Object.values(this.queues).map(queue => queue.destroy()))
        return super.destroy()
    }
}

