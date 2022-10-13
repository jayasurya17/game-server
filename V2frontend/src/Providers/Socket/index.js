import openSocket from 'socket.io-client';
import uuid from 'react-uuid';
import { getIdTokenOfUser } from '../Firebase/config'

const  socket = openSocket(import.meta.env.VITE_SOCKET, {
    extraHeaders: {
        sysid: uuid()
    }
});

socket.on('connect', async () => {
    const authId = await getIdTokenOfUser();
    if (authId) {
        socket.emit('login', authId)
    }
})

export default socket;