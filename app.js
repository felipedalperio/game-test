
const mapData = {
  minX: 1,
  maxX: 14,
  minY: 4,
  maxY: 12,
  blockedSpaces: {
    "7x4": true,
    "1x11": true,
    "12x10": true,
    "4x7": true,
    "5x7": true,
    "6x7": true,
    "8x6": true,
    "9x6": true,
    "10x6": true,
    "7x9": true,
    "8x9": true,
    "9x9": true,
  },
};


function getRandomSafeSpot() {
  //We don't look things up by key here, so just return an x/y
  return randomFromArray([
    { x: 1, y: 4 },
    { x: 2, y: 4 },
    { x: 1, y: 5 },
    { x: 2, y: 6 },
    { x: 2, y: 8 },
    { x: 2, y: 9 },
    { x: 4, y: 8 },
    { x: 5, y: 5 },
    { x: 5, y: 8 },
    { x: 5, y: 10 },
    { x: 5, y: 11 },
    { x: 11, y: 7 },
    { x: 12, y: 7 },
    { x: 13, y: 7 },
    { x: 13, y: 6 },
    { x: 13, y: 8 },
    { x: 7, y: 6 },
    { x: 7, y: 7 },
    { x: 7, y: 8 },
    { x: 8, y: 8 },
    { x: 10, y: 8 },
    { x: 8, y: 8 },
    { x: 11, y: 4 },
  ]);
}


// Options for Player Colors... these are in the same order as our sprite sheet
const playerColors = ["blue", "red", "orange", "yellow", "green", "purple"];

//Misc Helpers
function randomFromArray(array) {
  return array[Math.floor(Math.random() * array.length)];
}
function getKeyString(x, y) {
  return `${x}x${y}`;
}

function isSolid(x,y){
  const blockedNextSpace = mapData.blockedSpaces[getKeyString(x, y)];
  return (
    blockedNextSpace ||
    x >= mapData.maxX ||
    x < mapData.minX ||
    y >= mapData.maxY ||
    y < mapData.minY
  )
}

function createName() {
  const prefix = randomFromArray([
    "COOL",
    "SUPER",
    "HIP",
    "SMUG",
    "COOL",
    "SILKY",
    "GOOD",
    "SAFE",
    "DEAR",
    "DAMP",
    "WARM",
    "RICH",
    "LONG",
    "DARK",
    "SOFT",
    "BUFF",
    "DOPE",
  ]);
  const animal = randomFromArray([
    "BEAR",
    "DOG",
    "CAT",
    "FOX",
    "LAMB",
    "LION",
    "BOAR",
    "GOAT",
    "VOLE",
    "SEAL",
    "PUMA",
    "MULE",
    "BULL",
    "BIRD",
    "BUG",
  ]);
  return `${prefix} ${animal}`;
}


(function () {

  let playerId;
  let playerRef;
  let players = {};
  let playerElements = {};
  let coins = {};
  let chat = {};
  let coinElements = {};

  let messagenEscrita;

  const gameContainer = document.querySelector(".game-container");
  const chatContainer = document.querySelector(".chat-conversas");
  const playerNameInput = document.querySelector("#player-name");
  const playerColorButton = document.querySelector("#player-color");
  const buttonSendMessage = document.querySelector(".enviar-texto");
  const message = document.querySelector(".texto-escrito");
  const chatBloco = document.querySelector(".chat-conversas");

  function placeCoin() {
    const { x, y } = getRandomSafeSpot();
    const coinRef = firebase.database().ref(`coins/${getKeyString(x, y)}`);
    coinRef.set({
      x,
      y,
    })
    const coinTimeouts = [2000, 3000, 4000, 5000];
    setTimeout(() => {
      placeCoin();
    }, randomFromArray(coinTimeouts));
  }


  function talking(message) {
    const place = "cafeteria";
    const chatRef = firebase.database().ref(`chat/${place}`);
    console.log(message)
    chatRef.push(message);
  }

  function attemptGrabCoin(x,y){
    const key = getKeyString(x,y);
    if(coins[key]){ // se existir um coin nessa posição a gente vai remover
      firebase.database().ref(`coins/${key}`).remove();
      //e atualiza o usuario que pegou essa moeda:
      playerRef.update({
        coins:players[playerId].coins + 1
      })
    }

  }

  function handleArrowPress(xChange=0, yChange=0) {
    //ira mover o seu perosnagem
    const newX = players[playerId].x + xChange;
    const newY = players[playerId].y + yChange;
    if (!isSolid(newX,newY)) {
      //move to the next space
      players[playerId].x = newX;
      players[playerId].y = newY;
      if (xChange === 1) {
        players[playerId].direction = "right";
      }
      if (xChange === -1) {
        players[playerId].direction = "left";
      }
      playerRef.set(players[playerId]);
      attemptGrabCoin(newX, newY);
    }
  }

  function initGame(){

    new KeyPressListener("ArrowUp", () => handleArrowPress(0, -1))
    new KeyPressListener("ArrowDown", () => handleArrowPress(0, 1))
    new KeyPressListener("ArrowLeft", () => handleArrowPress(-1, 0))
    new KeyPressListener("ArrowRight", () => handleArrowPress(1, 0))

    const allPlayersRef = firebase.database().ref(`players`);
    const allCoinsRef = firebase.database().ref(`coins`);
    const allChatRef = firebase.database().ref(`chat`);

    //listener 
    allPlayersRef.on("value", (snapshot) => {
      //despara quando ouver quaisquer alguma mudança
      players = snapshot.val() || {}; //vai pegar todos os dados dos palayers;
      Object.keys(players).forEach((key) => {
        // aqui a gente esta pegando player por player e setando onome dele, a moeda, a cor
        const characterState = players[key];
        let el = playerElements[key];
        // atualiza o DOM
        el.querySelector(".Character_name").innerText = characterState.name;
        el.querySelector(".Character_coins").innerText = characterState.coins;
        el.setAttribute("data-color", characterState.color);
        el.setAttribute("data-direction", characterState.direction);
        const left = 16 * characterState.x + "px";
        const top = 16 * characterState.y - 4 + "px";
        el.style.transform = `translate3d(${left}, ${top}, 0)`;
      })
    })
    
    allPlayersRef.on("child_added", (snapshot) => {
      //dispara quando um novo filho é criado
      const addedPlayer = snapshot.val() //ira pegar os valores da arvore (name, id , direction, color)
      //colocando um novo elemento no html
      const characterElement = document.createElement("div") 
      characterElement.classList.add("Character","grid-cell")

      if(addedPlayer.id == playerId){ //sou eu
          characterElement.classList.add("you");
      }

      characterElement.innerHTML = (`
        <div class="Character_shadow grid-cell"></div>
        <div class="Character_sprite grid-cell"></div>
        <div class="Character_name-container">
          <span class="Character_name"></span>
          <span class="Character_coins">0</span>
        </div>
        <div class="Character_you-arrow"></div>
      `);
      //adicionando esse HTMl que no caso é o personagem dentro da lista de PlayerElements
      playerElements[addedPlayer.id] = characterElement;

      //preencher alguns estados iniciais (nome, quantas moedas, cor , posicionamento do personagem)
      characterElement.querySelector(".Character_name").innerText = addedPlayer.name;
      characterElement.querySelector(".Character_coins").innerText = addedPlayer.coins;
      characterElement.setAttribute("data-color", addedPlayer.color);
      characterElement.setAttribute("data-direction", addedPlayer.direction);
      const left = 16 * addedPlayer.x + "px";
      const top = 16 * addedPlayer.y - 4 + "px";
      characterElement.style.transform = `translate3d(${left}, ${top}, 0)`;
      
      //adicionando personagem dentro da div .game-container
      gameContainer.appendChild(characterElement);
    })  

    allChatRef.child(`cafeteria`).on("child_added", (snapshot) => {
      const chatElement = document.createElement("div")
      snapshot.forEach(() => {
          chatElement.innerHTML = (`
          <div class="balao">
            <div class="name">${snapshot.val().name}</div>
            <span>${snapshot.val().message}</span>
          </div>
        `);
    
        chatContainer.appendChild(chatElement);
      });
      //VAI ATE EMBAIXO O SCROLL
      chatBloco.scrollTop = chatBloco.scrollHeight;
    })

    allCoinsRef.on("child_added", (snapshot) => {
      const coin = snapshot.val();
      const key = getKeyString(coin.x, coin.y);
      coins[key] = true;

      // Create the DOM Element
      const coinElement = document.createElement("div");
      coinElement.classList.add("Coin", "grid-cell");
      coinElement.innerHTML = `
        <div class="Coin_shadow grid-cell"></div>
        <div class="Coin_sprite grid-cell"></div>
      `;

      // Position the Element
      const left = 16 * coin.x + "px";
      const top = 16 * coin.y - 4 + "px";
      coinElement.style.transform = `translate3d(${left}, ${top}, 0)`;

      // Keep a reference for removal later and add to DOM
      coinElements[key] = coinElement;
      gameContainer.appendChild(coinElement);
    })
    allCoinsRef.on("child_removed", (snapshot) => {
      const {x,y} = snapshot.val();
      const keyToRemove = getKeyString(x,y);
      gameContainer.removeChild( coinElements[keyToRemove] );
      delete coinElements[keyToRemove];
    })

    //Atualiza o nome do usuarrio
    playerNameInput.addEventListener("change", (e) =>{
      const newName = e.target.value || createdName();
      playerNameInput.value = newName;
      playerRef.update({
        name: newName
      })
    })
    //Atualiza a cor do personagem:
    playerColorButton.addEventListener("click", () =>{
      const myPerson = players[playerId];
      const mySkinIndex = playerColors.indexOf(myPerson.color)
      //ira pegar a proxima cor :
      const nextColor = playerColors[mySkinIndex + 1] || playerColors[0];
      playerRef.update({
        color : nextColor
      })
    })
    
    buttonSendMessage.addEventListener("click", () =>{
      let nameUser = players[playerId].name;
      let sendMess = {
         name : nameUser,
         message : message.value
      }
      if(message.value != "" || message.value != null){
        talking(sendMess)
      }
      message.value = '';
      
    })
    //Chama as moedas
    placeCoin();
  }

  firebase.auth().onAuthStateChanged((user) =>{
    console.log(user);
    if(user){ //voce esta logado
      playerId = user.uid;
      playerRef = firebase.database().ref(`players/${playerId}`);
      
      const name = createName();
      playerNameInput.value = name;

      const {x, y} = getRandomSafeSpot();

      playerRef.set({
        id: playerId,
        name,
        direction:"right",
        color:randomFromArray(playerColors),
        x,
        y,
        coins: 0
      })

      //remover se o usuario sair:
      playerRef.onDisconnect().remove();

      //começa o jogo quando vce loga:
      initGame();

    }else{ // voce esta deslogado

    }
  })

  firebase.auth().signInAnonymously().catch((error) => {
    var errorCode = error.code;
    var errorMessage = error.message;
    // ...
    console.log(errorCode, errorMessage);
  });
})();