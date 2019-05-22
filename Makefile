#
# CLI Interface to the project
#

init:
	yarn && lerna bootstrap

clean:
	lerna run clean
	lerna clean --yes
	(cd ./app && make clean)
	(cd ./integration && make clean)
	rm -rf ./node_modules

#
# CLI Interface to the working app
#

init-app:
	(cd ./app && make init)

start-app:
	(cd ./app && make start)

stop-app:
	(cd ./app && make stop)


#
# CLI Interface to the integration tests
#

test:
	(cd ./integration && make test)

start-tdd:
	(cd ./integration && make run)

stop-tdd:
	(cd ./integration && make run)

run-tdd:
	(cd ./integration && make run)
