`use strict`

import config from '../../../config'
import mongoose from 'mongoose'

mongoose.connect(config.database.mongoDbUrl, { useNewUrlParser: true, useUnifiedTopology: true })
.then(() => console.log('MongoDB Connected'))
mongoose.set('useFindAndModify', false);
mongoose.Promise = global.Promise
let db = mongoose.connection
db.on('error', console.error.bind(console, 'MongoDB connection error:'))

module.exports = db