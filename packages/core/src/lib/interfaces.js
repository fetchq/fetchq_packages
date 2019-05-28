import EventEmitter from 'events'

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
        return new Promise((resolve, reject) => {
            if (this.status === STATUS_INITIALIZED) {
                resolve()
                return
            }
            
            // wait for initialization to complete
            this.once(EVENT_READY, resolve)
            
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
    }

    async isReady () {
        await this.client.isReady()
        return super.isReady()
    }
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
        if (!this.queues[name]) {
            return this.queues[name] = new this.queueConstructor(queueName, this.client)
        }
        return this.queues[name]
    }
}

