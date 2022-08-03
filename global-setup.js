const dotenv = require('dotenv')
const { join } = require('path')

module.exports = async () => {
    dotenv.config({ path: join(__dirname, '.env.test') })
    process.env.TZ = 'UTC'
}
