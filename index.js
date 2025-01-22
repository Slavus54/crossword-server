require('dotenv').config()

const app = require('express')()
const {Codus} = require('codus.js')
const bodyParser = require('body-parser')
const cors = require('cors')
const fs = require('fs')
const {Client} = require('pg')

const PORT = process.env.WEBSERVER_PORT
const FILE_PATH = process.env.FILE_PATH

const headlines = require('./api/headlines.json')

const codus = new Codus()

const client = new Client({
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME
})

// middleware

app.use(cors())
app.use(bodyParser.urlencoded({extended: true}))
app.use(bodyParser.json({limit: '2mb'}))

// db connection

client.connect().then(() => console.log('PostgreSQL is connected...'))

const sse = (_, res) => {
    res.setHeader("Content-Type", "text/event-stream")
    res.setHeader("Cache-Control", "no-cache")
    res.setHeader("Connection", "keep-alive")

    setInterval(() => {
        let headline = codus.random(headlines)

        res.write(`data: ${headline} \n`)
        res.write("\n")
    }, 1e3)
}

app.get('/words', async (_, res) => {
    client.query("SELECT * FROM Words WHERE word NOT IN('') ", (err, data) => {
        if (data) {
            res.send(data.rows)
        } else {
            res.send([])
        }
        
    })
})

app.get('/stream', async (req, res) => {
    sse(req, res)
})

app.post('/create-word', async (req, res) => {
    const {text, word, category, type, level, length} = req.body

    client.query(`INSERT INTO Words VALUES ('${text}', '${word}', '${category}', '${type}', '${level}', ${length})`)
    
    fs.writeFile(FILE_PATH, word + '\n', err => {
        new Error(err)
    })

    res.sendStatus(2e2)
})

app.get('/get-word', async (req, res) => {
    fs.readFile(FILE_PATH, (err, data) => {
        if (err) {
            return new Error(err)
        }

        res.send({text: data.toString()}) 
    })
})

app.listen(PORT, console.log(`Express server started on ${PORT} port`))