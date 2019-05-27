
export class FetchQDuplicateClientError extends Error {
    constructor(message) {
        super(message)
        this.name = `FetchQDuplicateClientError`
    }
}

export class FetchQClientNotFoundError extends Error {
    constructor(message) {
        super(message)
        this.name = `FetchQClientNotFoundError`
    }
}

export class FetchQDriverNotFoundError extends Error {
    constructor(message) {
        super(message)
        this.name = `FetchQDriverNotFoundError`
    }
}

export class FetchQDuplicateDriverError extends Error {
    constructor(message) {
        super(message)
        this.name = `FetchQDuplicateDriverError`
    }
}
