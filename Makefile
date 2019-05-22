
dev:
	docker run \
		-it \
		--rm \
		--name fetchq-db \
		-p 5432:5432 \
		-v ${PWD}/data/pg:/var/lib/postgresql/data \
		-e POSTGRES_USER=postgres \
		-e POSTGRES_PASSWORD=postgres \
		-e POSTGRES_DB=postgres \
		postgres:11.3-alpine

undev:
	docker stop fetchq-db && \
	docker rm -f fetchq-db
