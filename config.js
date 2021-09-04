require('dotenv').config();
const nconf = require('nconf');
nconf.argv()
    .env();

if (nconf.get("config-file") !== undefined) {
    nconf.file(nconf.get("config-file"));
}

module.exports = nconf;