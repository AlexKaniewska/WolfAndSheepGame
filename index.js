const express = require('express');
const app = express();
app.listen(3000,() => console.log('Listening to U.'));
app.use(express.static('public'));
app.use(express.json());

//mqtt
const mqtt = require('mqtt');
const client = mqtt.connect("mqtt://broker.hivemq.com");
client.on("connect",function(){	
    console.log("Connected successfully");
});
client.on("error",function(error){
    console.log("Connection failed:" + error);
    process.exit(1)
});



//subject room
const WIOROOM = "wioroom";
 
//database
let rooms = [
{id:1, num: 0, player1: "", player2: "", player1ID: 0, player2ID:0, spectators: [], spectatorsID: [], sheep1: "A1", sheep2: "C1", sheep3: "E1", sheep4: "G1", wolf: "B8", lastFrom: "", lastTo: "", who: "player1"},
{id:2, num: 0, player1: "", player2: "", player1ID: 0, player2ID:0, spectators: [], spectatorsID: [], sheep1: "A1", sheep2: "C1", sheep3: "E1", sheep4: "G1", wolf: "B8", lastFrom: "", lastTo: "", who: "player1"},
{id:3, num: 0, player1: "", player2: "", player1ID: 0, player2ID:0, spectators: [], spectatorsID: [], sheep1: "A1", sheep2: "C1", sheep3: "E1", sheep4: "G1", wolf: "B8", lastFrom: "", lastTo: "", who: "player1"},
{id:4, num: 0, player1: "", player2: "", player1ID: 0, player2ID:0, spectators: [], spectatorsID: [], sheep1: "A1", sheep2: "C1", sheep3: "E1", sheep4: "G1", wolf: "B8", lastFrom: "", lastTo: "", who: "player1"},
{id:5, num: 0, player1: "", player2: "", player1ID: 0, player2ID:0, spectators: [], spectatorsID: [], sheep1: "A1", sheep2: "C1", sheep3: "E1", sheep4: "G1", wolf: "B8", lastFrom: "", lastTo: "", who: "player1"}]



//-------------------------------------

//login and  show available/all rooms
app.post('/login', (req, res) => {
    const role = req.body.userType;
    const userID = new Date().valueOf();
    if(role == "player") {
        let free_rooms = []
    for(i=0; i < rooms.length; i++) {
        if(rooms[i].num != 2) {
            free_rooms.push({id: rooms[i].id, freeslots: rooms[i].num, spectators: rooms[i].spectators})
        }
    }
    res.json({
        status: "true",
        userID: userID,
        rooms: free_rooms
    })
    }
    else {
        res.json({
            status: "true",
            userID: userID,
            rooms:rooms
        })
    }
})


//add a player to the room
app.post('/join', (req, res) => {
    const login = req.body.userName;
    const roomID = req.body.roomId;
    const role = req.body.userType;
    const userID = req.body.userID;
    let turn = "";
    //player
    if(role == "player"){
        for(i=0; i < rooms.length; i++) {
            if(rooms[i].id == roomID) {
                if(rooms[i].player1 == ""){
                    rooms[i].player1 = login;
                    rooms[i].num = 1;
                    rooms[i].player1ID = userID;
                    
                    res.json({
                        id: userID,
                        status: "true",
                        playerRole: "owce",
                        sheep1: rooms[i].sheep1,
                        sheep2: rooms[i].sheep2,
                        sheep3: rooms[i].sheep3,
                        sheep4: rooms[i].sheep4,
                        wolf: rooms[i].wolf,
                        turn: "owce"
                    })
    
                }
                else {
                        rooms[i].player2 = login;
                        rooms[i].num = 2;
                        rooms[i].player2ID = userID;
                        if(rooms[i].who == "player1"){
                            turn = "owce"
                        }
                        else {
                            turn = "wilk"
                        }
                        res.json({
                            id: userID,
                            status: "true",
                            playerRole: "wilk",
                            sheep1: rooms[i].sheep1,
                            sheep2: rooms[i].sheep2,
                            sheep3: rooms[i].sheep3,
                            sheep4: rooms[i].sheep4,
                            wolf: rooms[i].wolf,
                            turn: turn
                        })
                    }
            }
        }
    }
    //spectator
    else{
        for(i=0; i < rooms.length; i++){
            if(rooms[i].id == roomID){
                rooms[i].spectators.push(login);
                rooms[i].spectatorsID.push(userID);
                res.json({
                    id: userID,
                    playerRole: "spectator",
                    status: "true",
                    who: rooms[i].who,
                    sheep1: rooms[i].sheep1,
                    sheep2: rooms[i].sheep2,
                    sheep3: rooms[i].sheep3,
                    sheep4: rooms[i].sheep4,
                    wolf: rooms[i].wolf

                })
                
            }
        
        }
    }
})

//make a move
app.post('/move', (req, res) => {
    req.setTimeout(0);
    const playerID = req.body.userID;
    const roomID = req.body.userRoomID;
    const from = req.body.destFrom;
    const to = req.body.destTo;

    //mqtt
    const subject = WIOROOM + String(roomID);


    for(i=0; i < rooms.length; i++) {
        if(rooms[i].id == roomID) {
            if(rooms[i].player1ID == playerID) {
                if(rooms[i].who == "player1"){
                    if(CheckMoveSheep(rooms[i].sheep1, rooms[i].sheep2, rooms[i].sheep3, rooms[i].sheep4, rooms[i].wolf, from, to) == true) {
                        if(rooms[i].sheep1 == from){
                            rooms[i].sheep1 = to;
                        }
                        else if(rooms[i].sheep2 == from){
                            rooms[i].sheep2 = to;
                        }
                        else if(rooms[i].sheep3 == from){
                            rooms[i].sheep3 = to;
                        }
                        else if(rooms[i].sheep4 == from){
                            rooms[i].sheep4 = to;
                        }
                        rooms[i].lastFrom = from;
                        rooms[i].lastTo = to;
                        rooms[i].who = "player2";
                        let victory = CheckVictory(rooms[i].sheep1, rooms[i].sheep2, rooms[i].sheep3, rooms[i].sheep4, rooms[i].wolf);
                        res.json({
                            status: "true",
                            victory: victory
                        })
                        if(victory == true){
                            victory = "tr"
                        }
                        else if(victory == false){
                            victory = "fa"
                        }
                        const message = "mo" + victory + "wi" + rooms[i].sheep1 + rooms[i].sheep2 + rooms[i].sheep3 + rooms[i].sheep4 + rooms[i].wolf;
                        if (client.connected == true){
                            client.publish(subject,message);
                        }
                    }
                }
            }
            else if(rooms[i].player2ID == playerID){
                if(rooms[i].who == "player2"){
                    if(CheckMoveWolf(rooms[i].sheep1, rooms[i].sheep2, rooms[i].sheep3, rooms[i].sheep4, rooms[i].wolf, to) == true) {
                        rooms[i].wolf = to;
                        rooms[i].lastFrom = from;
                        rooms[i].lastTo = to;
                        rooms[i].who = "player1";
                        let victory = CheckVictory(rooms[i].sheep1, rooms[i].sheep2, rooms[i].sheep3, rooms[i].sheep4, rooms[i].wolf);
                        res.json({
                            status: "true",
                            victory: victory,
                        })
                        if(victory == true){
                            victory = "tr"
                        }
                        else if(victory == false){
                            victory = "fa"
                        }
                        const message = "mo" + victory + "ow" + rooms[i].sheep1 + rooms[i].sheep2 + rooms[i].sheep3 + rooms[i].sheep4 + rooms[i].wolf;
                        if (client.connected == true){
                            client.publish(subject,message);
                        }
                    }
                }

            }
        }
    }
})

//undo a move
app.post('/undo', (req, res) => {
    req.setTimeout(0);
    const userID = req.body.userID;
    const room_id = req.body.userRoomID;
    const subject = WIOROOM + String(room_id);
    
    for(i=0; i< rooms.length; i++) {
        if(rooms[i].id == room_id){
            if(rooms[i].lastFrom != false && rooms[i].lastTo != false){
                if(rooms[i].player1ID == userID && rooms[i].who == "player2"){
                    if (client.connected == true){
                        client.publish(subject,"rewi");
                    }
                    res.json({
                        status: "true"
                    })
                }
                else if(rooms[i].player2ID == userID && rooms[i].who == "player1"){
                    if (client.connected == true){
                        client.publish(subject,"reow");
                    }
                    res.json({
                        status: "true"
                    })
                }
            
            }
        

        }
    }
})

//agreement for undo
app.post('/undoyes', (req, res) => {
    req.setTimeout(0);
    const room_id = req.body.userRoomID;
    const subject = WIOROOM + String(room_id);

    for(i=0; i < rooms.length; i++){
        if(rooms[i].id == room_id){
            if(rooms[i].lastTo == rooms[i].wolf) {
                rooms[i].wolf = rooms[i].lastFrom;
                rooms[i].lastFrom = false;
                rooms[i].lastTo = false;
                rooms[i].who = "player2";

                const message = "mo" + "fa" + "wi" + rooms[i].sheep1 + rooms[i].sheep2 + rooms[i].sheep3 + rooms[i].sheep4 + rooms[i].wolf;
                if (client.connected == true){
                    client.publish(subject, message);
                }
                res.json({
                    status: "true"
                })
            }
            else {
                if(rooms[i].lastTo == rooms[i].sheep1) {
                    rooms[i].sheep1 = rooms[i].lastFrom;
                }
                else if(rooms[i].lastTo == rooms[i].sheep2) {
                    rooms[i].sheep2 = rooms[i].lastFrom
                }
                else if(rooms[i].lastTo == rooms[i].sheep3) {
                    rooms[i].sheep3 = rooms[i].lastFrom
                }
                else if(rooms[i].lastTo == rooms[i].sheep4) {
                    rooms[i].sheep4 = rooms[i].lastFrom
                }
                rooms[i].lastFrom = false;
                rooms[i].lastFrom = false;
                rooms[i].who = "player1";
                const message = "mo" + "fa" + "ow" + rooms[i].sheep1 + rooms[i].sheep2 + rooms[i].sheep3 + rooms[i].sheep4 + rooms[i].wolf;
                if (client.connected == true){
                    client.publish(subject,message);
                }
                res.json({
                    status: "true"
                })
            }
        }
    }
})

//add a new room
app.post('/newroom', (req,res) => {
    const role = req.body.userType;

    AddRoom();

    if(role == "player") {
        let free_rooms = []
    for(i=0; i < rooms.length; i++) {
        if(rooms[i].num != 2) {
            free_rooms.push({id: rooms[i].id, freeslots: rooms[i].num, spectators: rooms[i].spectators})
        }
    }
    res.json({
        status: "true",
        rooms: free_rooms
    })
    }
    else {
        res.json({
            status: "true",
            rooms:rooms
        })
    }

})

app.post('/victory', (req, res) => {
    const room_id = req.body.userRoomID;
    RoomBeginStatus(room_id);
    res.json({
        status: true
    })
})
//-------------------------------------functions

//checking victory
function CheckVictory(s1, s2, s3, s4, w) {
    let letter = w.charCodeAt(0);
    let number = w.charCodeAt(1);
    
    if(w == "A1" || w == "C1" || w == "E1" || w == "G1"){
        return true
    }
    else if(letter == 65){
        if(CheckMoveWolf(s1, s2, s3, s4, w, String.fromCharCode(66,number+1)) == false && CheckMoveWolf(s1, s2, s3, s4, w, String.fromCharCode(66,number-1)) == false){
            return true
        }
        else {
            return false
        }
    }
    else if (letter == 72){
        if(CheckMoveWolf(s1, s2, s3, s4, w, String.fromCharCode(71,number+1)) == false && CheckMoveWolf(s1, s2, s3, s4, w, String.fromCharCode(71,number-1)) == false){
            return true
        }
        else {
            return false
        }
    }
    else {
        if(CheckMoveWolf(s1, s2, s3, s4, w, String.fromCharCode(letter-1, number-1)) == false && CheckMoveWolf(s1, s2, s3, s4, w, String.fromCharCode(letter-1, number+1)) == false && CheckMoveWolf(s1, s2, s3, s4, w, String.fromCharCode(letter+1, number-1)) == false && CheckMoveWolf(s1, s2, s3, s4, w, String.fromCharCode(letter+1, number+1)) == false){
            return true
        }
        else {
            return false
        }
    }
}

//checking movement
function CheckMoveWolf(s1, s2, s3, s4, wFrom, wTo) {

    let fromLetter = wFrom.charCodeAt(0);
    let fromNumber = wFrom.charCodeAt(1);
    let toLetter = wTo.charCodeAt(0);
    let toNumber = wTo.charCodeAt(1);

    if(toNumber == 1 + fromNumber || toNumber == fromNumber - 1){
        //A
        if(fromLetter == 65){
            if(toLetter == 66) {
                if(wTo == s1 || wTo == s2 || wTo == s3 || wTo == s4){
                    return false
                }
                else {
                    return true
                }
            }
            else {
                return false
            }
        }
        //H
        else if (fromLetter == 72){
            if(toLetter == 71){
                if(wTo == s1 || wTo == s2 || wTo == s3 || wTo == s4){
                    return false
                }
                else {
                    return true
                }
            }
            else {
                return false
            }
        }
        else {
            if((toLetter == fromLetter + 1) || (toLetter == fromLetter - 1)){
                if(wTo == s1 || wTo == s2 || wTo == s3 || wTo == s4){
                    return false
                }
                else {
                    return true
                }
            }
            else {
                return false
            }
        }
    }

}

//checking movement
function CheckMoveSheep(s1, s2, s3, s4, w, sFrom, sTo){

    let fromLetter = sFrom.charCodeAt(0);
    let fromNumber = sFrom.charCodeAt(1);
    let toLetter = sTo.charCodeAt(0);
    let toNumber = sTo.charCodeAt(1);

    if(sFrom == s1 || sFrom == s2 || sFrom == s3 || sFrom == s4){
        if(toNumber == fromNumber + 1) {
            //A
            if(fromLetter == 65){
                if(toLetter == 66) {
                    if(sTo == w || sTo == s1 || sTo == s2 || sTo == s3 || sTo == s4){
                        return false
                    }
                    else {
                        return true
                    }
                }
                else {
                    return false
                }
            }
            //H
            else if (fromLetter == 72){
                if(toLetter == 71){
                    if(sTo == w || sTo == s1 || sTo == s2 || sTo == s3 || sTo == s4){
                        return false
                    }
                    else {
                        return true
                    }
                }
                else {
                    return false
                }
            }
            else {
                if((toLetter == fromLetter + 1) || (toLetter == fromLetter - 1)){
                    if(sTo == w || sTo == s1 || sTo == s2 || sTo == s3 || sTo == s4){
                        return false
                    }
                    else {
                        return true
                    }
                }
                else {
                    return false
                }
            }

        }
        else {
            return false
        }
    }
    else {
        return false
    }
}

//adding a new room
function AddRoom(){
    let room = {id:0, num: 0, player1: "", player2: "", player1ID: 0, player2ID:0, spectators: [], spectatorsID: [], sheep1: "A1", sheep2: "C1", sheep3: "E1", sheep4: "G1", wolf: "B8", lastFrom: "", lastTo: "", who: "player1"};
    room.id = rooms.length + 1;
    rooms.push(room);
}


//change to the initial state
function RoomBeginStatus(room_id){
    for(i=0; i < rooms.length; i++){
        if(rooms[i].id == room_id){
            rooms[i].num = 0;
            rooms[i].player1 = "";
            rooms[i].player2 = "";
            rooms[i].player1ID = 0;
            rooms[i].player2ID = 0;
            rooms[i].spectators = [];
            rooms[i].spectatorsID = [],
            rooms[i].sheep1 = "A1";
            rooms[i].sheep2 = "C1";
            rooms[i].sheep3 = "E1";
            rooms[i].sheep4 = "G1";
            rooms[i].wolf = "B8";
            rooms[i].lastFrom = "";
            rooms[i].lastTo = "";
            rooms[i].who = "player1"
        }
    }
}