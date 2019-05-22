# Development App

This is used to work on the FetchQ libraries and live test it on a running
app that receives freshly built artifacts.

First time you run it:

    make init

Start working on the app:

    make start

Stop working on the app:

    make stop

This will run a Postgres instance with a volume linked to `./data/pg` on port `5432`.  
Plus it will run the `lerna run watch:to` script aiming to this folder, and finally
it will run the local app as `nodemon index.js`.

