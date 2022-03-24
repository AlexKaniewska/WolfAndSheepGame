let userName;
let userID;
let userType;
let userRoomID;
let playerRole;
let connection = true;

//mqtt
let mqtt;
const reconnectTimeout = 2000;
const host = "broker.hivemq.com";
const port = 8000;

function onConnect() {
      console.log("Connected to MQTT.");
      return false;
}

function onFailure() {
    console.log("Connection failed.")
    return false;
}

function onConnectionLost(){
    console.log("Connection lost");
    return false;
}

function MQTTconnect() {
    console.log("Connecting to "+ host +" "+ port);
    mqtt = new Paho.MQTT.Client(host,port, String(userID));

    var options = {
        timeout: 3,
        onSuccess: onConnect,
        onFailure: onFailure,
         };
         
    mqtt.onConnectionLost = onConnectionLost;
    mqtt.onMessageArrived = onMessageArrived;
    mqtt.connect(options); //connect
      
    return false;
}

function onMessageArrived(r_message){

    let out_msg="Message received "+r_message.payloadString+"<br>";
    out_msg=out_msg+"Message received Topic "+r_message.destinationName;
    console.log(out_msg);

    let formatedMsg = r_message.payloadString.toString().match(/.{1,2}/g)
    //msg to server
    if(r_message.destinationName === "wioroom" + userRoomID){
        //msg - player movement
        if(formatedMsg[0] == "mo"){
            if(formatedMsg[1] === "fa"){
                showGame(formatedMsg[3],formatedMsg[4],formatedMsg[5],formatedMsg[6],formatedMsg[7]);
                if(formatedMsg[2] === "ow") document.getElementById("userTurn").innerHTML = "owce";
                else if(formatedMsg[2] === "wi") document.getElementById("userTurn").innerHTML = "wilk";
            }else if(formatedMsg[1] === "tr"){
                 if(formatedMsg[2] === "ow" && playerRole === "owce") alert("Przegrałeś ;( ");
                 else if(formatedMsg[2] === "ow" && playerRole === "wilk") alert("Wygrałeś gratulacje!");
                 else if(formatedMsg[2] === "wi" && playerRole === "owce") alert("Wygrałeś gratulacje!");
                 else if(formatedMsg[2] === "wi" && playerRole === "wilk") alert("Przegrałeś ;( ");  
                 mqtt.unsubscribe("wioroom" + userRoomID);
                 mqtt.unsubscribe("wioroomComment" + userRoomID);
                 mqtt.unsubscribe("wioroomChat" + userRoomID);
                 victory();
                 connection = false;
                //end of the game
            }
        }
        else if(formatedMsg[0] == "re"){
            if((formatedMsg[1] === "ow" && playerRole === "owce") || (formatedMsg[1] === "wi" && playerRole === "wilk")){
                if (confirm('Czy zgadzasz się na cofnięcie ruchu przeciwnika?')) {
                    let sendData = {userRoomID};

                    const postOptions = {
                        method: 'POST',
                        headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(sendData)
                    };

                    fetch('/undoyes',postOptions)
                    .then(response => response.json())
                    .then(data => {
                    console.log(data);
       
                    }).catch((error) => console.log(error))
                    
                  } else {
                    
                    console.log('Nie wyraziłeś zgody na ruch przeciwnika');
                  }
            }  
        }
    }
    else if(r_message.destinationName === "wioroomComment" + userRoomID){
        document.getElementById("commentBox").innerHTML += r_message.payloadString + "</br>";
    }

    else if(r_message.destinationName === "wioroomChat" + userRoomID){
        document.getElementById("chatBox").innerHTML += r_message.payloadString + "</br>";
    }

    
    return false;
    }

function MQTTsubscribe(name){
    mqtt.subscribe(name);
    console.log("Zasubskrybowano topic MQTT:" + name)
    return false;
}

function MQTTsend(topicSend,msgSend){

    let msg = msgSend;

    let topic = topicSend;
    message = new Paho.MQTT.Message(msg);
    message.destinationName = topic;
    mqtt.send(message);
    return false;
}


//login
function login() {
    userName = document.getElementById('userName').value;
    if(document.getElementById('typeUser1').checked === true){
        userType = "player";
    }
    else if(document.getElementById('typeUser2').checked === true){
        userType = "spectator";
    }
    if(document.getElementById('typeUser1').checked === true || document.getElementById('typeUser2').checked === true){
        let userData = {userName,userType}

        const postOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData)
        }

        fetch('/login',postOptions)
        .then(response => response.json())
        .then(data => {
            console.log(data);
            if(data.status === "true"){
                userID = data.userID;
                //disable the login section view
                document.getElementById('loginSection').style.display = "none";
                MQTTconnect();

                //delete recently viewed rooms
                let roomList = document.getElementById('roomList');
                while (roomList.firstChild) {
                    roomList.removeChild(roomList.lastChild);
                }

                //enable visibility of <div> room
                roomSection.style.display = "block";
                showRoom(data.rooms);
            }
            
        })
        .catch((error) => {
            console.error('Error:', error);
        });
    } 
}

//show all rooms
function showRoom(rooms){
    for(let i=0 ; i < rooms.length ;i++){
        let roomButton = [];

        roomButton[i] = document.createElement("button");
        roomButton[i].innerHTML = "Pokoj nr: " + rooms[i].id;

        document.getElementById("roomList").appendChild(roomButton[i]);

        roomButton[i].addEventListener ("click", function() {
            document.getElementById('roomSection').style.display = "none";
            joinGame(rooms[i].id);
        })
    }
}

//add a player to the room
function joinGame(roomId){

    let sendData = {userName,userType,roomId, userID};

    const postOptions = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(sendData)
    };

    fetch('/join',postOptions)
    .then(response => response.json())
    .then(data => {
        console.log(data);
        if(data.status === "true"){

            playerRole = data.playerRole; //Wolf / sheep or spectator!
            userRoomID = roomId;
            MQTTsubscribe("wioroom" + userRoomID);
            MQTTsubscribe("wioroomComment" + userRoomID);

            if(playerRole != "spectator"){
                MQTTsubscribe("wioroomChat" + userRoomID);
            }
            document.getElementById("userTurn").innerHTML = data.turn;
            document.getElementById("userRole").innerHTML = playerRole;
            showGame(data.sheep1,data.sheep2,data.sheep3,data.sheep4,data.wolf);
        }
        else if(data.status === "false"){
            document.getElementById('loginSection').style.display = "block";
        }
    })
    .catch((error) => {
        console.error('Error:', error);
    });
}


//displaying the positions of sheeps and wolf on the board
function showGame(sheep1,sheep2,sheep3,sheep4,wolf){
    //game section, comments and chat view
    document.getElementById('gameSection').style.display = "block";
    document.getElementById('commentSection').style.display = "block";
    if(playerRole != "spectator"){
        document.getElementById('chatSection').style.display = "block";
        document.getElementById('controlSection').style.display = "block";
    }
    else{
        document.getElementById('chatSection').style.display = "none";
        document.getElementById('controlSection').style.display = "none";
    }
    
    //clearing the board
    for(let i = 0; i < 8 ; i++){
        for(let j = 0; j < 8 ; j++){
            
            let cord ="";
            cord = String.fromCharCode(i+65,j+49);
            document.getElementById(cord).innerHTML = "";
        }
    }
    document.getElementById(sheep1).innerHTML = "<img src=\"lamb.png\" width=\"25px\" height=\"25px\">";;
    document.getElementById(sheep2).innerHTML = "<img src=\"lamb.png\" width=\"25px\" height=\"25px\">";
    document.getElementById(sheep3).innerHTML = "<img src=\"lamb.png\" width=\"25px\" height=\"25px\">";
    document.getElementById(sheep4).innerHTML = "<img src=\"lamb.png\" width=\"25px\" height=\"25px\">";
    document.getElementById(wolf).innerHTML = "<img src=\"wolf.png\" width=\"25px\" height=\"25px\">";

}

//movement regex
function CheckRegex(recordFrom, recordTo) {
    let expression = /^[A-H][1-8]$/
    let regex = new RegExp(expression);
    if (recordFrom.match(regex) && (recordTo.match(regex))) {
      return true
    } 
    else {
      return false
    }
  }

function movePlayer(){
    if(connection == true){
        let destFrom = document.getElementById("fromMoveField").value;
        let destTo = document.getElementById("toMoveField").value;
        if(CheckRegex(destFrom,destTo) === true){

            let sendData = {userID,userRoomID,destFrom,destTo};

            const postOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(sendData)
            };

            fetch('/move',postOptions)
            .then(response => response.json())
            .then(data => {
                console.log(data); 
                document.getElementById("fromMoveField").value = "";
                document.getElementById("toMoveField").value = ""; 
            }).catch((error) => console.log(error))
        }
    }
}

function sendChat(){
    if(connection == true) {
        let msg = userName + ": ";
        msg += document.getElementById("userChatMsgField").value;
        MQTTsend("wioroomChat"+ userRoomID, msg);

        document.getElementById("userChatMsgField").value = "";
    }
}

function sendComment(){
    if(connection == true){
        let msg = userName + ": ";
        msg += document.getElementById("userCommentMsgField").value;
        MQTTsend("wioroomComment"+ userRoomID, msg);
    
        document.getElementById("userCommentMsgField").value = "";
    }
}

function newRoom(){

    let sendData = {userType};

    const postOptions = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(sendData)
    };

    fetch('/newroom',postOptions)
    .then(response => response.json())
    .then(data => {
        console.log(data);
        if(data.status === "true"){

            //delete recently viewed rooms
            let roomList = document.getElementById('roomList');
            while (roomList.firstChild) {
                roomList.removeChild(roomList.lastChild);
            }

            //enable visibility of <div> room
            roomSection.style.display = "block";
            showRoom(data.rooms);
        }
    }).catch((error) => console.log(error))
}

function undoMove(){
    if(connection == true){
        let sendData = {userID,userRoomID};

        const postOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(sendData)
        };

        fetch('/undo',postOptions)
        .then(response => response.json())
        .then(data => {
            console.log(data);
        
        }).catch((error) => console.log(error))
        }
    
}

function victory(){
    let sendData = {userRoomID};

    const postOptions = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(sendData)
    };

    fetch('/victory',postOptions)
    .then(response => response.json())
    .then(data => {
        console.log(data);
       
    }).catch((error) => console.log(error))
}