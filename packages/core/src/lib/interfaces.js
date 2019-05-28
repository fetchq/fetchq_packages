import EventEmitter from 'events'

export const STATUS_DEFAULT = 0
export const STATUS_INITIALIZING = 1
export const STATUS_INITIALIZED = 2

export const EVENT_READY = 'ready'

export class FetchQInit extends EventEmitter {
    constructor () {
        super()
        this.status = 0
        this.driver = null
    }

    setDriver (driver) {
        this.driver = driver
    }

    // should consolidate the queue in the memory system
    // so that the other methods are going to work fine
    // 
    // it should turn "status" to "1"
    // and emit "ready" event
    async init () {}

    // removes all the event listeners that have been associated
    async destroy () {
        this.eventNames().forEach(name => this.removeAllListeners(name))
    }

    // should return a promise that resolves once "init()"
    // has consolidated the queue
    async isReady () {
        return new Promise(resolve => {
            if (this.status === STATUS_INITIALIZED) {
                resolve()
                return
            }

            this.once(EVENT_READY, resolve)
        })
    }
}

export class FetchQQueue extends FetchQInit {
    async isReady () {
        if (!this.driver) {
            throw new Error('queue is missing driver')
        }
        
        if (!this.driver.client) {
            throw new Error('queue is missing client')
        }

        if (this.driver.client.status === STATUS_DEFAULT) {
            await this.driver.client.connect()
        }

        return super.isReady()
    }

    // Pushes one or more documents with unique subject
    async push (docs) {}

    async count () {}
}

export class FetchQDriver extends FetchQInit {
    constructor (config, client) {
        super()
        this.config = config
        this.client = client
    }

    // should consolidate the driver initialization stuff
    // fileSystem: load data from disk and create queues
    // postgres: load settings and create queues instances
    async connect () {}

    // @overridable
    // how to create a new queue
    createQueueRef (name) {
        return new FetchQQueue(name)
    }

    ref (name) {
        if (!this.queues[name]) {
            this.queues[name] = this.createQueueRef(name)
            this.queues[name].setDriver(this)
        }
        return this.queues[name]
    }
}

