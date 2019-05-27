# FetchQ API

```js
import fetchq from 'fetchq'

// creates a global instance of the client, so the app can enjoy it and
// use it globally without any trouble.
//
// if you try to use a global function without initialization, you
// should get some errors
await fetchq.connect({
    driver: {
        type: 'postgres' // different drivers should be available
        // ...{ driver options}
    }
})

// check out the current status, something like:
// 0 - uninitialized
// 1 - ready to operate
// -1 for errors
const status = fetchq.status()
console.log(status)
```

## Data Ingestion

```js
// Tries to add documents into a given queue:
// - if queue does not exists, it is created with default values
// - if document exists in the queue, it is skipped
const result = await fetchq.push(queue_name, documents[])
// Result:
// - pushed: 10
// - skipped: 5
//
// Throws:
// new FetchQPushError


// Tries to upsert documents into a given queue:
// - if queue does not exists, it is created with default values
// - if document does not exists, it is created
// - if document exits, try to update it 
const result = await fetchq.upsert(queue_name, documents[])
// Result:
// - pushed: 10
// - updated: 5
// - skipped: 2 (documents that are not eligible for upsert)
//
// Throws:
// new FetchQUpsertError
```

### Updating Rules

Active documents are not eligible for update.

Updatable Fields:

- payload
- nextExecution
- priority

## Data Processing

A Worker should implement some kind of _stream API_, so from the outside it should be
possible to "listen" to emitted data (much likely logs), or send some kind of _SIGTERM_
to stop the worker.

```js
const worker = fetchq.registerWorker({
    queue: 'xxx',
    handler: () => {},
})

worker.on('data', () => {})
worker.on('error', () => {})

worker.kill()
worker.pause()
worker.resume()
```

If you try to register multiple workers for a queue it should throw `FetchQRegisterWorkerError`.
Only one worker per client at any point in time.

## Queue Management

Queues get created the first time you try to put a document into that. For this purpose
there should be some kind of default settings stored somewhere that define how new queues
should behave.

A queue can have some options like:

- logLevel - rule what goes out to the stdout
- errors (on/off) - keep track of unhandled errors in a timeserie
- metrics (on/off) - keep track of ongoing numbers (good for huge queues)
- lockDuration (seconds) - default lock duration when picking the documents
- deadThreshold - how many attempts before to give up on a document
- rejectDelay - when a document is manually rejected, default reschedule date
- rescheduleDelay - when a document is manually rescheduled, default reschedule date
- workerChunk - how many documents should be fetched by a registered worker by default
- workerConcurrency - how many concurrent functions should run
- ...

The client should keep all these values in memory for each queue, and there are APIs to
change those as updates must be propagated to any connected client, and the "postgres" driver
may need to rebuild all the server functions for each queue.

```js
// explicitly create a queue
// returns a queue reference, or throws FetchQCreateError
const queue = await fetchq.create(queue_name, { options })

// reference an existing queue, or creates one
// returns a queue reference, or throws FetchQRefError
const queue = await fetchq.ref(queue_name, { options })

// Removes a queue from the system.
// "keepData" will preserve the queue table if supported by the driver
await fetchq.drop(queue_name, {
    keepData: false,
})

// Updates the queue settings.
// This might be critical as those info may affect how registered workers behave
// plus the postgres driver might need to regenerate the server functions and so forth.
// 
// I guess it may work like this
// 1. stop registered workers (on all connected clients)
// 2. update settings
// 3. flush settings to other connected clients (driver stuff)
// 4. driver chanche to deal with new setting
// 5. start workers back
//
// The same kind of process (without step.3 and 4) should happen on connected clients
// that simply receive the new settings from the client that initiated them
//
// Yes, this stuff need to happen in co-ordination among all the connected clients
// that is a driver implementation detail. but a tough one!
//
// at any time the most important thing would be to be able to stop all the registered
// workers in any connected client, wait for this operation to complete and only THEN
// update the queue settings, flush the change, and start them all again.
// 
// this may require some kind of table where we keep track of the running workers with
// a "desired status" and "current status" column or stuff like that.
await fetchq.update(queue_name, { options })
```

## Queue Reference

This idea comes from Firebase. 

Each queue should be represented as an instance of a class, each queue has a singleton
instance that should be maintained inside the connection instance object.

This instance should be an event emitter, so to be able to register side effects when
stuff happens.

The _ref_ should also offer methods like `push`, `upsert` and `registerWorker` with the
same API as the generic ones, but targeting the specific queue.

## Queue Monitoring

```js
// produces a list of stats for the queues that are requested.
// it uses cached data if available, or computed, based on each queue settings.
await fetchq.stats(queues_names)

// same as before but generates computed results for everything.
await fetchq.computeStats(queue_names)

// force computes, and update cache for the involved stats
await fetchq.consolidateStats(queue_names)

// this should send out info regarding the settings, running workers, short term
// throughput of each worker or generic one.
await fetchq.info(queue_names)
```


## Clients / Workers Table

When it comes to the Postgres driver I guees we will need to keep a table to track
active registered workers.

That also means that we should keep a table with the active registered clients, each
client should have an ID, each worker should have an ID. There should be some pinging
and keepalive mechanisms.

This tables might be used by clients to register to updates just to find out when all
of them have stopped or started, possibly register errors or stuff like that.

Basically coordination tables.

