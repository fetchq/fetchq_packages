import { FetchQQueue } from '@fetchq/core'

export class FetchQQueueMemory extends FetchQQueue {
    constructor (config) {
        super (config)
        console.log('CREATE A QUEUE')
    }
}

