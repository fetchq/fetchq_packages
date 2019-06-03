
export class FetchQWorker {
    constructor (queue, handler, settings = {}) {
        this.queue = queue
        this.handler = handler

        // Log references names to perform accurate logging during destroying cycles
        this.queueName = queue.name
        this.clientName = queue.client.name

        this.delay = settings.delay || 0
        this.sleep = settings.sleep || 1000
        this.batch = settings.batch || 1

        this.docs = []

        this.isRunning = false
        this.isPaused = false
        this.isSleeping = false
        this.__timeout = null

        // Quit sleep in case new documents appear in the queue
        this.queue.on('pending', () => {
            // console.log('**** receive PENDi')
            if (this.isSleeping === true) {
                // console.log('break sleep')
                clearTimeout(this.__timeout)
                this.loop()
            }
        })
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
        this.destroyed = true
        this.docs = null
    }

    async pause () {
        clearTimeout(this.__timeout)
        this.isRunning = false
        this.isPaused = true
    }

    async resume () {
        this.isRunning = true
        this.isPaused = false
        return this.loop()
    }

    async fetchDocs () {
        this.docs = [
            ...this.docs,
            ...(await this.queue.pick({
                limit: this.batch,
            })),
        ]
    }

    async loop () {
        this.isSleeping = false

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
            this.isSleeping = true
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
        //
        // it could fail if the worker handler resolves after the instance was destroyed
        // in that case the document will become a genuine orphan and we silence the
        // error.
        //
        // probably we need to log out some stuff to the stdout, but no need to trigger
        // a real error
        try {
            await action.handler()
        } catch (err) {
            if (this.destroyed === true) {
                // @TODO: handle better logging
                console.log(`Could not perform "${this.clientName}/${this.queueName}/${action.name}()" - ${err.message}`)
            } else {
                const error = new Error(`Could not perform "${this.clientName}/${this.queueName}/${action.name}()" - ${err.message}`)
                error.originalError = err
                throw error
            }
        }

        this.__timeout = setTimeout(() => this.loop(), this.delay)
    }
}
