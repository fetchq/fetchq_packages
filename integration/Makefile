#
# One shot test would run as:
#
#     make run
#
# If you are working actively on the product you may want start
# the database independently and then run a test:
#
#     make start-dbv
#     make test
#
# When you are done, tear down the database:
#
#     make stop-db
#

# Starts the db completely into a Docker container
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

# Starts the db with a local data volume that you can investigate
start-dbv:
	docker run \
		-d \
		--name fetchq-db-test \
		-v ${PWD}/data/pg:/var/lib/postgresql/data \
		-p 5432:5432 \
		-e POSTGRES_USER=postgres \
		-e POSTGRES_PASSWORD=postgres \
		-e POSTGRES_DB=postgres \
		postgres:11.3-alpine \
		-c shared_buffers=256MB fsync=off

stop-db:
	docker stop fetchq-db-test
	docker rm -f fetchq-db-test

build:
	(cd .. && TARGET=${PWD} lerna run build:to)

# Just executes the tests, it assumes there is a database running
test: build
	echo "RUN DO TEST"

# Runs a full test session
run: start-db test stop-db
		
		