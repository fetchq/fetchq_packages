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
# CLI Interface to the Working App
#

init-app:
	(cd ./app && make init)

start-app:
	(cd ./app && make start)

stop-app:
	(cd ./app && make stop)


#
# CLI Interface to the Integration Tests
#

unit:
	lerna run test

test:
	(cd ./integration && make test)

tdd:
	(cd ./integration && make tdd)

tdd-watch:
	(cd ./integration && make watch)

