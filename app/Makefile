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
	docker-compose up -d database

stop-db:
	docker-compose stop database
	docker-compose rm -f database

# Forces freshly built dependencies into the next test execution
watch:
	(cd .. && TARGET=${PWD} lerna run watch:to)



