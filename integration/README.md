# Integration Tests

To run a single stateless integration test session type:

    make test

(durig a single run the db is exposed to `5433`)

To start a TDD session type:

    make tdd

This will create a running databases with a permanent volume mapped to
`/.data/pg`. The db is exposed to `5432`.

To start to watch the packages sources and rebuild on change (also trigger
a new test run) type:

    make watch


