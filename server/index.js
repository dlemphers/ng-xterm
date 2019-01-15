const express = require('express');
const expressWs = require('express-ws');
const os = require('os');
const pty = require('node-pty');

const app = express();
expressWs(app);

const terminals = {};
const logs = {};

const isDev = process.env.NODE_ENV !== 'production';


if (isDev) {
    app.use(function(req, res, next) {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        next();
    });
} else {
    app.get('/', function(req, res) {
        res.sendFile(__dirname + '/index.html');
    });
    app.get('*.*', express.static(__dirname, {
        maxAge: '1y'
    }));
}

app.post('/terminals', function(req, res) {
    const cols = parseInt(req.query.cols);
    const rows = parseInt(req.query.rows);
    const term = pty.spawn(process.platform === 'win32' ? 'cmd.exe' : 'bash', [], {
        name: 'xterm-color',
        cols: cols || 80,
        rows: rows || 24,
        cwd: process.env.PWD,
        env: process.env
    });

    console.log('Created terminal with PID: ' + term.pid);
    terminals[term.pid] = term;
    logs[term.pid] = '';
    term.on('data', function(data) {
        logs[term.pid] += data;
    });
    res.send(term.pid.toString());
    res.end();
});

app.post('/terminals/:pid/size', function(req, res) {
    const pid = parseInt(req.params.pid);
    const cols = parseInt(req.query.cols);
    const rows = parseInt(req.query.rows);
    const term = terminals[pid];

    term.resize(cols, rows);
    console.log('Resized terminal ' + pid + ' to ' + cols + ' cols and ' + rows + ' rows.');
    res.end();
});

app.ws('/terminals/:pid', function(ws, req) {
    const term = terminals[parseInt(req.params.pid)];
    console.log('Connected to terminal ' + term.pid);
    ws.send(logs[term.pid]);

    function buffer(socket, timeout) {
        let s = '';
        let sender = null;
        return (data) => {
            s += data;
            if (!sender) {
                sender = setTimeout(() => {
                    socket.send(s);
                    s = '';
                    sender = null;
                }, timeout);
            }
        };
    }

    const send = buffer(ws, 5);

    term.on('data', function(data) {
        try {
            send(data);
        } catch (ex) {
            // The WebSocket is not open, ignore
        }
    });
    ws.on('message', function(msg) {
        term.write(msg);
    });
    ws.on('close', function() {
        term.kill();
        console.log('Closed terminal ' + term.pid);
        // Clean things up
        delete terminals[term.pid];
        delete logs[term.pid];
    });
});

const port = process.env.PORT || 3000;
const host = os.platform() === 'win32' ? '127.0.0.1' : '0.0.0.0';

console.log('App listening to http://' + host + ':' + port);
app.listen(port, host);
