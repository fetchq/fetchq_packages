#		-v ${PWD}/data/pg:/var/lib/postgresql/data \
start-db:
	docker run \
		-d \
		--name fetchq-db-test \
		-p 5432:5432 \
		-e POSTGRES_USER=postgres \
		-e POSTGRES_PASSWORD=postgres \
		-e POSTGRES_DB=postgres \
		postgres:11.3-alpine \
		-c shared_buffers=256MB fsync=off

stop-db:
	docker stop fetchq-db-test
	docker rm -f fetchq-db-test

test:
	echo "DO TEST"

run: start-db test stop-db
		
		