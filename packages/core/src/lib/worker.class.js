
export class FetchQWorker {
    constructor (queue, handler, settings = {}) {
        this.queue = queue
        this.handler = handler

        this.delay = settings.delay || 1000
        this.sleep = settings.sleep || 5000
        this.batch = settings.batch || 1

        this.docs = []

        this.isRunning = false
        this.__timeout = null
    }

    async start () {
        this.isRunning = true
        return this.loop()
    }

    async stop () {
        this.isRunning = false
        clearTimeout(this.__timeout)
    }

    async destroy () {
        await this.stop()
    }

    async pause () {
        clearTimeout(this.__timeout)
    }

    async resume () {}

    async fetchDocs () {
        this.docs = [
            ...this.docs,
            ...(await this.queue.pick({
                limit: this.batch,
            })),
        ]
    }

    async loop () {
        if (!this.isRunning) {
            clearTimeout(this.__timeout)
            return
        }

        // fetch new docs
        if (!this.docs.length) {
            await this.fetchDocs()
        }

        // pause the loop waiting for new documents to become pending
        // @TODO: can check when is the next document planned
        //        and sleep until that moment, even for years :-)
        if (!this.docs.length) {
            // console.log('no documents, sleep for', this.sleep)
            this.__timeout = setTimeout(() => this.loop(), this.sleep)
            return
        }

        // prepare doc to execute
        const doc = this.docs.shift()

        const mixDoc = (doc, payload) => ({
            ...doc,
            ...(payload ? { payload } : {}),
        })

        // run the document handler and obtain the action to perform
        const action = await new Promise((resolve) => {
            this.handler(doc, {
                reschedule: (nextIteration, payload) =>
                    resolve({
                        name: 'reschedule',
                        handler: () => this.queue.reschedule(mixDoc(doc, payload), nextIteration)
                    }),
                complete: (payload) =>
                    resolve({
                        name: 'complete',
                        handler: () => this.queue.complete(mixDoc(doc, payload))
                    }),
                kill: (payload) =>
                    resolve({
                        name: 'kill',
                        handler: () => this.queue.kill(mixDoc(doc, payload))
                    }),
                reject: (err, nextIteration, payload) =>
                    resolve({
                        name: 'reject',
                        handler: () => this.queue.reject(mixDoc(doc, payload), err, nextIteration),
                    })
            })
        })

        // perform the requested action
        try {
            await action.handler()
        } catch (err) {
            console.log('Could not perform action', action)
        }

        this.__timeout = setTimeout(() => this.loop(), this.delay)
    }
}
