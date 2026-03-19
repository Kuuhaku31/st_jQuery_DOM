
const INITIAL_DRAW_COUNT = 3;
const PLAYER_CARD_LIMIT = 8;

// 游戏状态对象
const state = {}; 

// 获取初始状态对象的函数，返回一个新的状态对象
function initialState(state) {
    state.cardID = 0;            // 用于生成唯一卡牌 ID 的计数器
    state.playerCards = [];      // 玩家当前拥有的卡牌列表
    state.selectedCardId = null; // 当前选择的出战卡牌 ID 
    state.enemyCard = null;      // 电脑当前的卡牌
    state.round = 0;             // 当前回合数
    state.started = false;       // 游戏是否已开始
    state.isBusy = false;        // 是否正在进行异步操作（如抽卡或对战）
    state.gameOver = false;      // 游戏是否结束
    state.log = [];              // 游戏日志列表
}

// 输出日志信息：先写入数组，再统一渲染
function addLog(message) {
    state.log.unshift({
        time: new Date().toLocaleTimeString(),
        message,
    });
}

// 获取当前选择的出战卡牌对象，如果没有选择则返回 null
function getSelectedCard() {
    return state.playerCards.find((c) => c.id === state.selectedCardId) || null;
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

    // 更新回合数、卡牌数量和卡牌上限的显示
    {
        $("#round-text").text(state.round);
        $("#card-count").text(state.playerCards.length);
        $("#card-limit").text(PLAYER_CARD_LIMIT);
    }

    // 渲染当前选择的出战卡牌和电脑的卡牌，不显示操作按钮，出战卡牌高亮显示
    {
        const selectedCard = getSelectedCard();
        $("#selected-card").empty().append(createCardElement(selectedCard, false, true));
        $("#enemy-card").empty().append(createCardElement(state.enemyCard, false, false));
    }

    // 渲染手牌区
    // 如果玩家没有卡牌了，显示提示信息
    const cardsContainer = $("#player-cards");
    if(state.playerCards.length === 0) {
        cardsContainer.html("<p>没有卡牌了，请重新开始游戏。</p>");
    }
    // 否则渲染玩家的卡牌列表
    else {
        cardsContainer.empty(); // 清空当前的卡牌显示
        for (const card of state.playerCards) {
            const cardEl = createCardElement(card, !state.gameOver, card.id === state.selectedCardId);
            cardsContainer.append(cardEl);
        }
    }

    // 根据游戏状态更新按钮的可用性
    // 游戏未开始、已结束、正在进行异步操作或没有选择出战卡牌时禁用对战按钮
    // 正在进行异步操作时禁用开始游戏按钮
    // 游戏结束时禁用所有操作按钮
    {
        $("#battle-btn").prop("disabled", !state.started || state.gameOver || state.isBusy || !state.selectedCardId);
        $("#start-game").prop("disabled", state.isBusy);

        if (state.gameOver) {
            $(".choose-btn, .discard-btn").prop("disabled", true);
        }
    }

    // 根据 state.log 数组渲染日志
    {
        const logContainer = $("#log");
        logContainer.empty();

        const logs = Array.isArray(state.log) ? state.log : [];
        logs.forEach((item) => {
            const logItem = $("<li>").text(`[${item.time}] ${item.message}`);
            logContainer.append(logItem);
        });

        // 更新游戏状态文本，根据当前游戏状态显示不同的提示信息
        if (!state.started) {
            $("#game-status").text("未开始");
            return;
        }

        if (state.gameOver) {
            $("#game-status").text("游戏结束");
            return;
        }

        if (state.selectedCardId) {
            $("#game-status").text("已选择出战卡");
        } else {
            $("#game-status").text("等待选择卡牌");
        }
    }
}

// 从 API 获取一张新的卡牌对象
async function drawOneCard() {

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
    function makeCard(catImageUrl, userInfo) {

        // 计算卡牌的攻击力，基于用户的年龄和街道号码，确保最低攻击力为 10
        const attack = Math.max(10, (userInfo.age % 50) + (userInfo.streetNumber % 30));

        // 使用计数器生成卡牌 ID，保证同一局内递增唯一
        if (typeof state.cardID !== "number") {
            state.cardID = 0;
        }
        state.cardID += 1;

        return {
            id:       `card-${state.cardID}`, // 通过计数器生成唯一卡牌 ID
            imageUrl: catImageUrl,                                            // 卡牌的图片 URL
            name:     `${userInfo.firstName} ${userInfo.lastName}`,           // 卡牌的名称
            attack,                                                           // 卡牌的攻击力
        };
    }

    // 发起两个 API 请求，等待它们都完成后再创建卡牌对象
    const catImageUrl = await getCatImageUrl();
    const userInfo    = await getUserInfo();
    const newCard     = makeCard(catImageUrl, userInfo);

    return newCard;
}

// 开始游戏，重置状态并抽取初始卡牌
async function startGame() {

    // 重置游戏状态
    initialState(state); // 重新获取初始状态对象
    render();

    // 同时发起多个抽卡请求，等待所有请求完成后更新玩家的卡牌列表
    try {
        const tasks = Array.from({ length: INITIAL_DRAW_COUNT }, () => drawOneCard()); // 创建一个包含多个抽卡任务的数组
        const cards = await Promise.all(tasks); // 等待所有抽卡任务完成，得到一个包含多张卡牌的数组
        state.playerCards = cards; // 将抽取到的卡牌添加到玩家的卡牌列表中
        state.started = true;
        addLog(`开局抽卡完成，获得 ${cards.length} 张卡牌`);
    } catch (error) {
        console.error(error);
        addLog("开局抽卡失败，请检查网络后重试");
    } finally {
        state.isBusy = false;
        render();
    }
}

// 选择一张卡牌作为出战卡牌，更新状态并输出日志
function chooseCard(cardId) {

    // 如果游戏已结束或正在进行异步操作，禁止选择卡牌
    if (state.gameOver || state.isBusy) {
        return;
    }

    // 根据卡牌 ID 查找对应的卡牌对象，如果找不到则返回
    const card = state.playerCards.find((c) => c.id === cardId);
    if (!card) {
        return;
    }

    // 更新当前选择的出战卡牌 ID，并输出日志信息
    state.selectedCardId = cardId;
    addLog(`选择 ${card.name} 出战，攻击力 ${card.attack}`);
    render();
}

// 丢弃一张卡牌，从玩家的卡牌列表中移除，并更新状态和日志
function discardCard(cardId) {

    // 如果游戏已结束或正在进行异步操作，禁止丢弃卡牌
    if (state.gameOver || state.isBusy) {
        return;
    }

    // 根据卡牌 ID 查找对应的卡牌对象，如果找不到则返回
    const card = state.playerCards.find((c) => c.id === cardId);
    if (!card) {
        return;
    }

    // 从玩家的卡牌列表中移除丢弃的卡牌，如果丢弃的卡牌是当前选择的出战卡牌，则取消选择
    state.playerCards = state.playerCards.filter((c) => c.id !== cardId);
    if (state.selectedCardId === cardId) {
        state.selectedCardId = null;
    }

    addLog(`丢弃卡牌 ${card.name}`);

    if (state.playerCards.length === 0) {
        state.gameOver = true;
        addLog("你已没有卡牌，游戏结束");
    }

    render();
}

// 从玩家的卡牌列表中移除当前选择的出战卡牌，通常在对战失败时调用
function removeSelectedCardFromDeck() {
    state.playerCards = state.playerCards.filter((c) => c.id !== state.selectedCardId);
    state.selectedCardId = null;
}

// 执行一次对战，比较玩家选择的卡牌和电脑抽取的卡牌，根据结果更新状态和日志
async function doBattle() {

    // 如果游戏未开始、已结束或正在进行异步操作，禁止执行对战
    if (!state.started || state.gameOver || state.isBusy) {
        return;
    }

    // 获取当前选择的出战卡牌，如果没有选择则提示玩家先选择卡牌
    const playerCard = getSelectedCard();
    if (!playerCard) {
        addLog("请先选择一张出战卡牌");
        render();
        return;
    }

    // 设置正在进行对战的状态，禁用相关按钮，并更新界面
    state.isBusy = true;
    render();

    try {
        state.round += 1;
        const enemy = await drawOneCard(); // 从 API 获取电脑的卡牌对象
        state.enemyCard = enemy;

        addLog(`第 ${state.round} 回合：电脑抽到 ${enemy.name}（攻击力 ${enemy.attack}）`);

        if (playerCard.attack > enemy.attack) {
            if (state.playerCards.length < PLAYER_CARD_LIMIT) {
                state.playerCards.push(enemy);
                addLog(`你赢了，获得电脑卡牌 ${enemy.name}`);
            } else {
                addLog("你赢了，但卡牌已达到上限，无法获得新卡牌");
            }
        } else if (playerCard.attack < enemy.attack) {
            removeSelectedCardFromDeck();
            addLog(`你输了，失去出战卡牌 ${playerCard.name}`);
        } else {
            addLog("本回合平局，双方保留卡牌");
            state.selectedCardId = null;
        }

        if (state.playerCards.length === 0) {
            state.gameOver = true;
            addLog("你已没有卡牌，游戏结束");
        }

        if (!state.gameOver && state.selectedCardId && !state.playerCards.some((c) => c.id === state.selectedCardId)) {
            state.selectedCardId = null;
        }
    } catch (error) {
        console.error(error);
        addLog("对局失败，请稍后重试");
    } finally {
        state.isBusy = false;
        render();
    }
}

// 绑定页面上的按钮和卡牌操作事件，设置相应的事件处理函数
function bindEvents() {
    $("#start-game").on("click", startGame);
    $("#battle-btn").on("click", doBattle);

    $("#player-cards").on("click", ".choose-btn", function () {
        chooseCard($(this).data("id"));
    });

    $("#player-cards").on("click", ".discard-btn", function () {
        discardCard($(this).data("id"));
    });
}

$(function () {
    bindEvents();
    initialState(state); // 初始化游戏状态
    render();
    addLog("点击\"开始游戏\"以抽取初始卡牌");
});