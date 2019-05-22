
dev:
	(cd ./integration && make start-dbv)

undev:
	(cd ./integration && make stop-db)

test:
	(cd ./integration && make run)
	
test-dev:
	(cd ./integration && make test)
