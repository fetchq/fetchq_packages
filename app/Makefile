#
# CLI Interface
#

# Makes sure the dependencies are correctly set up
init:
	(cd .. && yarn && lerna bootstrap)
	yarn

# Boot a running app
start: start-db
	yarn start

# Runs a full test session
stop: stop-db
		
clean:
	rm -rf ./node_modules


#
# Internal tasks
#

# Starts the db with a local data volume that you can investigate
start-db:
	docker run \
		-d \
		--name fetchq-db-app \
		-v ${PWD}/data/pg:/var/lib/postgresql/data:cached \
		-p 5432:5432 \
		-e POSTGRES_USER=postgres \
		-e POSTGRES_PASSWORD=postgres \
		-e POSTGRES_DB=postgres \
		postgres:11.3-alpine \
		-c shared_buffers=256MB \
		-c fsync=off

stop-db:
	docker stop fetchq-db-app
	docker rm -f fetchq-db-app

# Forces freshly built dependencies into the next test execution
watch:
	(cd .. && TARGET=${PWD} lerna run watch:to)



