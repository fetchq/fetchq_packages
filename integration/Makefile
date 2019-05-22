#
# One shot test would run as:
#
#     make test
#
# If you are working actively on the product you may want start
# the database independently and then run a test:
#
#     make start-dbv
#     make run
#
# When you are done, tear down the database:
#
#     make stop-db
#

# Makes sure the dependencies are correctly set up
init:
	(cd .. && yarn && lerna bootstrap)

clean:
	rm -rf ./node_modules

# Starts the db completely into a Docker container
start-db:
	POSTGRES_PORT=5433 docker-compose up -d database

stop-db:
	docker-compose down

# Forces freshly built dependencies into the next test execution
build:
	(cd .. && TARGET=${PWD} lerna run build:to)

# Just executes the tests, it assumes there is a database running
run: build
	POSTGRES_PORT=5433 yarn test

# Runs a full test session
test: start-db init run stop-db
		
		
# Starts a TDD session
# The database is connected to `./data/pg` and exposed to `5432`
tdd:
	POSTGRES_PORT=5432 docker-compose up -d database-tdd
	POSTGRES_PORT=5432 yarn test --watch
	docker-compose down

# Forces freshly built dependencies into the next test execution
watch:
	(cd .. && TARGET=${PWD} lerna run watch:to)
