const express = require('express')
const socketio = require('socket.io')
const http = require('http')
const cors = require("cors");
const PORT = process.env.PORT || 5000;

const { addUser, removeUser, getUser, getUsersInRoom } = require('./users')

const router = require('./router')

const app = express();
const server = http.createServer(app);
const io = socketio(server, {
    cors: {
        origin: "*",
    }
});

app.use(cors());

io.on('connection', (socket) => {
    console.log('We have a new connetion!')

    socket.on('join', ({ name, room }, callback) => {
        const { error, user } = addUser({ id: socket.id, name, room })
    
        if(error) return callback(error)

        socket.emit('message', { 
            user: 'admin', 
            text: `${user.name}님이 ${user.room}에 입장하셨습니다`
        })
        socket.broadcast.to(user.room).emit('message', {
            user: 'admin', 
            text: `${user.name}님이 들어오셨습니다`
        })

        socket.join(user.room)

        io.to(user.room).emit('roomData', { 
            room: user.room, 
            users: getUsersInRoom(user.room)
        })

        callback()
    })

    socket.on('sendMessage', (message, callback) => {
        const user = getUser(socket.id)

        if (user) {
            console.log('Message:', message)

            io.to(user.room).emit('message', {
                user: user.name,
                text: message
            })

            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }

        callback()
    })

    socket.on('disconnect', () => {
        console.log('User has left!')
        const user = removeUser(socket.id)

        if (user) {
            io.to(user.room).emit('message', {
                user: 'admin',
                text: `${user.name}님이 방을 나가셨습니다`
            })
        }
    })
})

app.use(router)

server.listen(PORT, () => console.log(`Server has started on port ${PORT}`))