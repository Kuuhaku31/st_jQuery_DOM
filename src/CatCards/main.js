
const INITIAL_DRAW_COUNT = 3;
const PLAYER_CARD_LIMIT = 8;

const gameState = {};    // 游戏状态对象
let   isBusy    = false; // 是否正在进行异步操作（如抽卡或对战）

// 获取初始状态对象的函数，返回一个新的状态对象
function initialState(gameState) {
    gameState.cardID         = 0;      // 用于生成唯一卡牌 ID 的计数器
    gameState.playerCards    = [];     // 玩家当前拥有的卡牌列表
    gameState.selectedCardId = null;   // 当前选择的出战卡牌 ID 
    gameState.enemyCard      = null;   // 电脑当前的卡牌
    gameState.round          = 0;      // 当前回合数
    gameState.log            = [];     // 游戏日志列表
}

// 输出日志信息：先写入数组，再统一渲染
function addLog(message) {
    gameState.log.push({
        time: new Date().toLocaleTimeString(),
        message,
    });
}

// 通过id查询卡牌是否存在于玩家的卡牌列表中，如果存在则返回该卡牌对象，否则返回 null
function findCardById(cardId) {
    return gameState.playerCards.find((c) => c.id === cardId) || null;
}

// 移除卡牌
function removeCardById(cardId) {
    gameState.playerCards = gameState.playerCards.filter((c) => c.id !== cardId);
    if(gameState.selectedCardId === cardId) gameState.selectedCardId = null; // 如果丢弃的卡牌是当前选择的出战卡牌，则取消选择
}

// 从 API 获取一张新的卡牌信息
async function getCardInfoFromAPI() {

    const CAT_API  = "https://api.thecatapi.com/v1/images/search";
    const USER_API = "https://randomuser.me/api/?results=3&nat=jp";

    // 通用的 fetch JSON 数据函数，带错误处理
    // async 表示这是一个异步函数，可以使用 await 来等待 Promise 的结果
    async function fetchJson(url) {
        const response = await fetch(url);
        if(!response.ok) {
            throw new Error(`Request failed: ${response.status}`);
        }
        return response.json();
    }

    // 从猫咪 API 获取一张猫咪图片的 URL
    async function getCatImageUrl() {
        const data = await fetchJson(CAT_API);
        return data[0]?.url || "";
    }

    // 从随机用户 API 获取一个用户的信息
    async function getUserInfo() {
        const data = await fetchJson(USER_API);
        const user = data.results?.[0];
        if (!user) {
            throw new Error("No user data");
        }

        return {
            firstName:    user.name.first,             // 用户的名字
            lastName:     user.name.last,              // 用户的姓氏
            age:          user.dob.age,                // 用户的年龄
            streetNumber: user.location.street.number, // 用户住址的街道号码
        };
    }

    // 根据猫咪图片 URL 和用户信息创建一张卡牌对象
    function makeCardInfo(catImageUrl, userInfo) {

        // 计算卡牌的攻击力，基于用户的年龄和街道号码，确保最低攻击力为 10
        const attack = Math.max(10, (userInfo.age % 50) + (userInfo.streetNumber % 30));

        return {
            imageUrl: catImageUrl,                                            // 卡牌的图片 URL
            name:     `${userInfo.firstName} ${userInfo.lastName}`,           // 卡牌的名称
            attack:   attack,                                                 // 卡牌的攻击力
        };
    }

    // 发起两个 API 请求，等待它们都完成后再创建卡牌对象
    try {

        const catImageUrl = await getCatImageUrl();
        const userInfo    = await getUserInfo();
        const newCardInfo = makeCardInfo(catImageUrl, userInfo);
    try {

        const catImageUrl = await getCatImageUrl();
        const userInfo    = await getUserInfo();
        const newCardInfo = makeCardInfo(catImageUrl, userInfo);

        return newCardInfo;
    }

    // 如果在获取卡牌信息的过程中发生任何错误
    catch (error) {
        console.error("Error fetching card info:", error);
        return null;
    }
}

// 抽卡
async function drawOneCard(isForEnemy = false) {

    console.log("drawOneCard");

    isBusy = true; // 设置正在进行抽卡的状态，禁用相关按钮

    const newCardID = `card-${gameState.cardID++}`; // 生成新的卡牌 ID
    const newCard = {
        id:       newCardID, // 使用生成的卡牌 ID
        imageUrl: null,
        name:     null,
        attack:   null,
    };

    if(isForEnemy) gameState.enemyCard = newCard; // 更新电脑的卡牌状态以显示在界面上
    else gameState.playerCards.push(newCard); // 将新卡牌添加到玩家的卡牌列表中

    render();

    const cardInfo = await getCardInfoFromAPI(); // 从 API 获取卡牌信息（同步）
    if(!cardInfo) {
        addLog("抽卡失败，请检查网络连接或稍后再试");
    }

    // 如果为电脑抽卡
    else if(isForEnemy) {

        gameState.enemyCard.imageUrl = cardInfo.imageUrl;
        gameState.enemyCard.name     = cardInfo.name;
        gameState.enemyCard.attack   = cardInfo.attack;

        addLog(`第 ${gameState.round} 回合：电脑抽到 ${gameState.enemyCard.name}（攻击力 ${gameState.enemyCard.attack}）`);
    }

    // 如果为玩家抽卡
    else {
        // 更新玩家卡牌列表中对应卡牌的信息
        const playerCard = findCardById(newCardID);
        if(playerCard) {

            playerCard.imageUrl = cardInfo.imageUrl;
            playerCard.name     = cardInfo.name;
            playerCard.attack   = cardInfo.attack;

            addLog(`抽到卡牌 ${cardInfo.name}（攻击力 ${cardInfo.attack}）`);
        }
    }

    // 抽卡完成后重置状态并更新界面显示
    isBusy = false; // 重置正在进行抽卡的状态
    render();             // 更新界面显示
}

// 绑定页面上的按钮和卡牌操作事件，设置相应的事件处理函数
function bindEvents() {

    // 开始游戏，重置状态并抽取初始卡牌
    async function startGame() {

        console.log("startGame");

        // 重置游戏状态
        initialState(gameState); // 重新获取初始状态对象
        render();

        // 同时发起多个抽卡请求，等待所有请求完成后更新玩家的卡牌列表
        for (let i = 0; i < INITIAL_DRAW_COUNT; i++) {
        for (let i = 0; i < INITIAL_DRAW_COUNT; i++) {
            drawOneCard(false); // 抽取玩家的卡牌
        }
        addLog(`开局抽卡完成，获得 ${gameState.playerCards.length} 张卡牌`);
    
        render();

        console.log("startGame结束");
    }

    // 执行一次对战，比较玩家选择的卡牌和电脑抽取的卡牌，根据结果更新状态和日志
    async function doBattle() {

        console.log("doBattle");

        console.log("doBattle");

        // 获取当前选择的出战卡牌，如果没有选择则提示玩家先选择卡牌
        const playerCard = findCardById(gameState.selectedCardId);

        gameState.round += 1;        // 回合数加 1
        await drawOneCard(true); // 抽取电脑的卡牌，等待抽卡完成后再继续对战逻辑
        const enemy = gameState.enemyCard; // 获取电脑的卡牌信息

        // 比较玩家的出战卡牌和电脑的卡牌，根据攻击力决定胜负
        if(playerCard.attack > enemy.attack) {
            if (gameState.playerCards.length < PLAYER_CARD_LIMIT) {
                gameState.playerCards.push(enemy);
                addLog(`你赢了，获得电脑卡牌 ${enemy.name}`);
            } else {
                addLog("你赢了，但卡牌已达到上限，无法获得新卡牌");
            }
        }
        // 从玩家的卡牌列表中移除当前选择的出战卡牌，并取消选择
        else if (playerCard.attack < enemy.attack) {
            removeCardById(gameState.selectedCardId);
            addLog(`你输了，失去出战卡牌 ${playerCard.name}`);

            if (gameState.playerCards.length === 0) {
                addLog("你已没有卡牌，游戏结束");
            }
        }
        // 平局则双方保留卡牌，并取消选择
        else {
            addLog("本回合平局，双方保留卡牌");
            gameState.selectedCardId = null;
        }

        render();

        console.log("doBattle结束");
    }

    // 选择一张卡牌作为出战卡牌，更新状态并输出日志
    function chooseCard(cardId) {

        // 根据卡牌 ID 查找对应的卡牌对象，如果找不到则返回
        const card = findCardById(cardId);
        if(!card) return;

        // 更新当前选择的出战卡牌 ID，并输出日志信息
        gameState.selectedCardId = cardId;
        addLog(`选择 ${card.name} 出战，攻击力 ${card.attack}`);
        render();
    }

    // 丢弃一张卡牌，从玩家的卡牌列表中移除，并更新状态和日志
    function discardCard(cardId) {

        // 根据卡牌 ID 查找对应的卡牌对象，如果找不到则返回
        const card = findCardById(cardId);
        if(!card) return;

        // 从玩家的卡牌列表中移除丢弃的卡牌，如果丢弃的卡牌是当前选择的出战卡牌，则取消选择
        removeCardById(cardId);
        addLog(`丢弃卡牌 ${card.name}`);

        // 如果玩家没有卡牌了，游戏结束
        if(gameState.playerCards.length === 0) {
            addLog("你已没有卡牌，游戏结束");
        }

        render();
    }

    // 事件绑定
    $("#start-game")  .on("click", startGame);
    $("#battle-btn")  .on("click", doBattle);

    // 事件委托
    $("#player-cards").on("click", ".choose-btn",  function() { chooseCard ($(this).data("id")); });
    $("#player-cards").on("click", ".discard-btn", function() { discardCard($(this).data("id")); });
}

// 渲染游戏界面，根据当前状态更新页面上的卡牌、按钮状态和日志等信息
function render() {

    // 生成卡牌的 HTML 结构
    // showActions 参数控制是否显示出战和丢弃按钮
    // selected 参数控制是否高亮显示
    // 返回一个 jQuery 对象，表示整个卡牌元素
    function createCardElement(card, showActions, selected) {

        // 如果没有卡牌数据，返回一个提示信息
        if (!card) return $("<p>").text("暂无卡牌");

        // 创建卡牌的根元素，如果需要高亮显示则添加 selected 类
        const cardEl = $("<article>").addClass("card");
        if (selected) cardEl.addClass("selected");

        // 创建卡牌的图片元素
        const imageEl = $("<img>").attr("src", card.imageUrl).attr("alt", card.name);

        // 创建卡牌内容元素，包括名称和攻击力
        const contentEl = $("<div>").addClass("content");
        const nameEl    = $("<p>")  .addClass("name").text(card.name);
        const metaEl    = $("<p>")  .addClass("meta").html(`攻击力: <strong>${card.attack}</strong>`);

        // 将名称和攻击力添加到内容元素中
        contentEl.append(nameEl, metaEl);

        // 如果需要显示操作按钮，创建出战和丢弃按钮，并添加到内容元素中
        if(showActions) {
            const actionsEl  = $("<div>")   .addClass("card-actions");
            const chooseBtn  = $("<button>").addClass("choose-btn")        .data("id", card.id).text("出战");
            const discardBtn = $("<button>").addClass("discard-btn danger").data("id", card.id).text("丢弃");
            actionsEl.append(chooseBtn, discardBtn);
            contentEl.append(actionsEl);
        }

        // 将图片和内容添加到卡牌根元素中，并返回整个卡牌元素
        cardEl.append(imageEl, contentEl);
        return cardEl;
    }

    // 更新游戏状态显示
    {
        // 更新回合数、卡牌数量和卡牌上限的显示
        $("#round-text").text(gameState.round);
        $("#card-count").text(gameState.playerCards.length);
        $("#card-limit").text(PLAYER_CARD_LIMIT);

        // 根据游戏状态更新按钮的可用性
        // 游戏未开始、已结束、正在进行异步操作或没有选择出战卡牌时禁用对战按钮
        // 正在进行异步操作时禁用开始游戏按钮
        // 游戏结束时禁用所有操作按钮
        $("#battle-btn").prop("disabled", isBusy || !gameState.selectedCardId);
        $("#start-game").prop("disabled", isBusy);
    }

    // 渲染手牌区
    // 如果玩家没有卡牌了，显示提示信息
    const cardsContainer = $("#player-cards");
    if(gameState.playerCards.length === 0) {
        cardsContainer.html("<p>没有卡牌了，请重新开始游戏。</p>");
    }
    // 否则渲染玩家的卡牌列表
    else {
        cardsContainer.empty(); // 清空当前的卡牌显示
        for (const card of gameState.playerCards) {
            const cardEl = createCardElement(card, true, card.id === gameState.selectedCardId);
            cardsContainer.append(cardEl);
        }
    }

    // 渲染对战区
    {
        // 渲染当前选择的出战卡牌和电脑的卡牌，不显示操作按钮，出战卡牌高亮显示
        const selectedCard = findCardById(gameState.selectedCardId);
        $("#selected-card").empty().append(createCardElement(selectedCard, false, true));
        $("#enemy-card").empty().append(createCardElement(gameState.enemyCard, false, false));
    }

    // 根据 state.log 数组渲染日志
    {
        const logContainer = $("#log");
        logContainer.empty(); // 清空当前日志显示
        logContainer.empty(); // 清空当前日志显示

        for(let i = gameState.log.length - 1; i >= 0; i--) {
            const logEntry = gameState.log[i];
            const logEl = $("<p>").html(`<span class="timestamp">[${logEntry.time}]</span> ${logEntry.message}`);
            logContainer.append(logEl);
        }
    }
}

// 页面加载完成后执行的初始化函数
$(function () {

    bindEvents();        // 绑定事件处理函数
    initialState(gameState); // 初始化游戏状态
    render();            // 初始渲染界面

    addLog("点击\"开始游戏\"以抽取初始卡牌");
});
