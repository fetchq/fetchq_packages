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
